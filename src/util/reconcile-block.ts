import { EthClient } from '@ethercast/eth-jsonrpc-client';
import logger from './logger';
import BigNumber from 'bignumber.js';
import * as _ from 'underscore';
import { isBlockSaved, saveBlockData } from './ddb/block-data';
import { BLOCK_READY_TOPIC_NAME, NEW_BLOCK_QUEUE_NAME, NUM_BLOCKS_DELAY, REWIND_BLOCK_LOOKBACK } from './env';
import getNextFetchBlock from './state/get-next-fetch-block';
import notifyQueueOfBlock from './sqs/notify-queue-of-block';
import { getBlockStreamState, saveBlockStreamState } from './ddb/blockstream-state';
import { BlockWithFullTransactions, Log, TransactionReceipt } from '@ethercast/model';
import rewindOneBlock from './rewind-one-block';
import * as Lambda from 'aws-sdk/clients/lambda';
import * as SQS from 'aws-sdk/clients/sqs';
import * as SNS from 'aws-sdk/clients/sns';
import getTopicArn from './sns/get-topic-arn';

/**
 * This function is executed on a loop and reconciles one block worth of data
 *
 * Returns true if we should halt
 */
export default async function reconcileBlock(lambda: Lambda, sqs: SQS, sns: SNS, client: EthClient): Promise<boolean> {
  const state = await getBlockStreamState();

  // we have a configurable block delay which lets us reduce the frequency fo chain reorgs
  // as well as other harmless errors due to delays in node data indexing
  const currentBlockNo: BigNumber = (await client.eth_blockNumber()).minus(NUM_BLOCKS_DELAY);

  const nextFetchBlockNo: BigNumber = await getNextFetchBlock(state, currentBlockNo, REWIND_BLOCK_LOOKBACK);

  const blockNumbers = {
    currentBlockNo: currentBlockNo.valueOf(),
    nextFetchBlockNo: nextFetchBlockNo.valueOf()
  };

  if (currentBlockNo.lt(nextFetchBlockNo)) {
    logger.info({ blockNumbers }, 'next fetch block is not yet available');
    return true;
  }

  {
    const blocksToCurrent = currentBlockNo.minus(nextFetchBlockNo);

    if (blocksToCurrent.gt(10000)) {
      logger.fatal({ blockNumbers }, 'more than 10k blocks behind the network');
      return false;
    } else if (blocksToCurrent.gt(1000)) {
      logger.error({ blockNumbers }, 'more than 1000 blocks behind the network! it could take a while to catch up!');
    } else if (blocksToCurrent.gt(100)) {
      logger.warn({ blockNumbers }, 'more than 100 blocks behind the network!');
    } else if (blocksToCurrent.gt(10)) {
      logger.info({ blockNumbers }, 'more than 10 blocks behind the network.');
    }
  }

  logger.debug({ state, blockNumbers }, 'fetching block');

  let block: BlockWithFullTransactions;
  try {
    block = await client.eth_getBlockByNumber(nextFetchBlockNo, true);
  } catch (err) {
    logger.warn({ err, blockNumbers }, 'failed to get current block by number');
    return false;
  }

  logger.debug({
    blockNumbers,
    blockHash: block.hash,
    transactionsCount: block.transactions.length
  }, 'fetching tx receipts');

  let transactionReceipts: TransactionReceipt[];
  try {
    transactionReceipts = await client.eth_getTransactionReceipts(
      block.transactions.map(transaction => transaction.hash)
    );
  } catch (err) {
    logger.warn({
      blockNumber: block.number,
      blockHash: block.hash,
      err
    }, 'failed to get receipts');
    return false;
  }

  const logs: Log[] = _.flatten(transactionReceipts.map(receipt => receipt.logs), true);

  const metadata = {
    state,
    blockNumbers,
    blockHash: block.hash,
    blockNumber: block.number,
    logCount: logs.length,
    transactionCount: block.transactions.length,
    receiptsCount: transactionReceipts.length,
    parentHash: block.parentHash
  };

  logger.info({ metadata }, 'processing block data');

  // if any logs are not for this block, we encountered a race condition, try again later. log everything
  // since this rarely happens
  if (_.any(logs, ({ blockHash }) => blockHash !== block.hash)) {
    logger.warn({ metadata }, 'inconsistent logs: not all logs matched the block');
    logger.debug({ block, transactionReceipts, logs }, 'inconsistent logs');
    return false;
  }

  if (_.any(logs, ({ removed }) => Boolean(removed))) {
    logger.error({ metadata }, 'block received with a log already marked removed');
    return false;
  }

  //  detect chain reorganizations
  if (state) {
    const parentBlockSaved = await isBlockSaved(
      block.parentHash,
      new BigNumber(block.number).minus(1)
    );

    if (!parentBlockSaved) {
      logger.warn({ metadata }, 'detected chain reorg, attempting to rewind');

      try {
        await rewindOneBlock(sqs, state, metadata);
        logger.info({ metadata }, 'successfully rewound');
        return false;
      } catch (err) {
        logger.fatal({ metadata, state, err }, 'failed to handle chain reorganization');
        throw new Error('failed to handle chain reorg');
      }
    }
  }

  try {
    await saveBlockData(block, transactionReceipts, state !== null);
  } catch (err) {
    logger.error({ err, metadata }, 'failed to save block data');
    return false;
  }

  try {
    await notifyQueueOfBlock(sqs, block, false);
  } catch (err) {
    logger.error({
      QueueName: NEW_BLOCK_QUEUE_NAME,
      err,
      metadata
    }, 'failed to deliver block notification message to queue');
    return false;
  }

  try {
    // LAST step: save the blockstream state
    await saveBlockStreamState(state, block);
  } catch (err) {
    // If this fails, we get duplicate messages in the queue
    logger.error({ err, metadata }, 'failed to update blockstream state');
    return false;
  }

  // try invoking the queue drain lambda
  try {
    const TopicArn = await getTopicArn(sns, BLOCK_READY_TOPIC_NAME);
    await sns.publish({ Message: JSON.stringify(metadata), TopicArn }).promise();
    logger.info('notified block ready topic');
  } catch (err) {
    logger.error({ err, topicName: BLOCK_READY_TOPIC_NAME }, 'failed to notify topic');
    return false;
  }

  return false;
}
