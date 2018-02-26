import logger from './logger';
import BigNumber from 'bignumber.js';
import * as _ from 'underscore';
import { saveBlockData, isBlockSaved } from './ddb/block-data';
import {
  NETWORK_ID, DRAIN_BLOCK_QUEUE_LAMBDA_NAME, NEW_BLOCK_QUEUE_NAME,
  NUM_BLOCKS_DELAY
} from './env';
import { Lambda } from 'aws-sdk';
import { BlockQueueMessage } from './model';
import getNextFetchBlock from './get-next-fetch-block';
import { getQueueUrl, sqs } from './sqs/sqs-util';
import { getBlockStreamState, saveBlockStreamState } from './ddb/blockstream-state';
import { BlockWithTransactionHashes, Log, TransactionReceipt } from '../client/model';
import ValidatedEthClient from './validated-eth-client';
import rewindBlocks from './rewind-blocks';

const lambda = new Lambda();

/**
 * This function is executed on a loop and reconciles one block worth of data
 */
export default async function reconcileBlock(client: ValidatedEthClient): Promise<void> {
  const state = await getBlockStreamState();

  // we have a configurable block delay which lets us reduce the frequency fo chain reorgs
  // as well as other harmless errors due to delays in node data indexing
  const currentBlockNo: BigNumber = (await client.eth_blockNumber()).minus(NUM_BLOCKS_DELAY);

  const nextFetchBlock: BigNumber = await getNextFetchBlock(state, currentBlockNo);

  if (currentBlockNo.lt(nextFetchBlock)) {
    logger.debug({ currentBlockNo, nextFetchBlock }, 'next fetch block is not yet available');
    return;
  }

  const blocksToCurrent = currentBlockNo.minus(nextFetchBlock);

  if (blocksToCurrent.gt(10000)) {
    logger.fatal('MORE THAN 10K BLOCKS BEHIND THE NETWORK. WILL NEVER CATCH UP');
    return;
  } else if (blocksToCurrent.gt(1000)) {
    logger.error('more than 1000 blocks behind the network! it could take a while to catch up!');
  } else if (blocksToCurrent.gt(100)) {
    logger.warn('more than 100 blocks behind the network!');
  } else if (blocksToCurrent.gt(10)) {
    logger.info('more than 10 blocks behind the network.');
  }

  logger.debug({ currentBlockNo, nextFetchBlock }, 'fetching block');

  let block: BlockWithTransactionHashes;
  try {
    block = await client.eth_getBlockByNumber(nextFetchBlock, false);
  } catch (err) {
    logger.info({ err, currentBlockNo }, 'failed to get current block by number');
    return;
  }

  logger.debug({ blockHash: block.hash, transactionsCount: block.transactions.length }, 'fetching tx receipts');

  let transactionReceipts: TransactionReceipt[];
  try {
    transactionReceipts = await client.eth_getTransactionReceipts(block.transactions);
  } catch (err) {
    logger.info({ blockNumber: block.number, blockHash: block.hash, err }, 'failed to get receipts');
    return;
  }

  const logs: Log[] = _.flatten(transactionReceipts.map(receipt => receipt.logs), true);

  const metadata = {
    state,
    blockHash: block.hash,
    blockNumber: block.number,
    logCount: logs.length,
    transactionCount: block.transactions.length,
    parentHash: block.parentHash
  };

  logger.info({ metadata }, 'fetched block data');

  // if any logs are not for this block, we encountered a race condition, try again later. log everything
  // since this rarely happens
  if (_.any(logs, ({ blockHash }) => blockHash !== block.hash)) {
    logger.warn({ metadata }, 'inconsistent logs: not all logs matched the block');
    logger.debug({ block, logs }, 'inconsistent logs');
    return;
  }

  if (_.any(logs, ({ removed }) => removed)) {
    logger.error({ metadata }, 'block received with a log already marked removed');
    return;
  }

  //  check if the parent exists and rewind blocks if it does not
  if (state) {
    const parentBlockSaved = await isBlockSaved(
      block.parentHash,
      new BigNumber(block.number).minus(1)
    );

    if (!parentBlockSaved) {
      logger.warn({ metadata }, 'detected chain reorg, attempting to rewind blocks');

      try {
        await rewindBlocks(client, state, metadata);
        logger.info({ metadata }, 'successfully reconciled chain reorg');
        return;
      } catch (err) {
        logger.fatal({ metadata, state, err }, 'failed to handle chain reorganization');
        throw new Error('failed to handle chain reorg');
      }
    }
  }

  try {
    await saveBlockData(block, logs, state !== null);
  } catch (err) {
    logger.error({ err, metadata }, 'failed to save block data');
    return;
  }


  let QueueUrl: string;
  try {
    QueueUrl = await getQueueUrl(NEW_BLOCK_QUEUE_NAME);
  } catch (err) {
    logger.error({ err }, 'could not find queue url: ' + NEW_BLOCK_QUEUE_NAME);
    return;
  }

  try {
    const queueMessage: BlockQueueMessage = { hash: block.hash, number: block.number, removed: false };

    const { MessageId } = await sqs.sendMessage({
      QueueUrl,
      MessageGroupId: `net-${NETWORK_ID}`,
      MessageDeduplicationId: block.hash,
      MessageBody: JSON.stringify(queueMessage)
    }).promise();

    logger.info({ queueMessage, MessageId }, 'placed message in queue');
  } catch (err) {
    logger.error({
      QueueName: NEW_BLOCK_QUEUE_NAME,
      err,
      metadata
    }, 'failed to deliver block notification message to queue');
    return;
  }

  try {
    // LAST step: save the blockstream state
    await saveBlockStreamState(
      state,
      {
        network_id: NETWORK_ID,
        blockHash: block.hash,
        blockNumber: block.number,
        timestamp: new Date()
      }
    );
  } catch (err) {
    // TODO: if this fails, should we retract the message we sent on the queue?
    // probably not, we guarantee at-least-once delivery but not only-once delivery (it doesn't exist)
    // and this at worst causes the messages to be sent twice, which is not even a problem if it happens
    // within 5 minutes thanks to deduplication
    logger.error({ err, metadata }, 'failed to update blockstream state');
    return;
  }

  // now trigger a lambda to drain the queue
  try {
    logger.debug({ metadata, DRAIN_BLOCK_QUEUE_LAMBDA_NAME }, 'invoking lambda asynchronously to drain queue');

    const { StatusCode } = await lambda.invoke({
      FunctionName: DRAIN_BLOCK_QUEUE_LAMBDA_NAME,
      InvocationType: 'Event'
    }).promise();

    if (StatusCode !== 202) {
      throw new Error(`failed to invoke lambda to drain the queue: StatusCode ${StatusCode}`);
    }

    logger.info({ metadata }, 'lambda successfully invoked');
  } catch (err) {
    logger.error({ DRAIN_BLOCK_QUEUE_LAMBDA_NAME, err, metadata }, 'failed to invoke lambda after pushing to queue');
    return;
  }
}
