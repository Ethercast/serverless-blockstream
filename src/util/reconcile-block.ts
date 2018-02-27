import logger from './logger';
import BigNumber from 'bignumber.js';
import * as _ from 'underscore';
import { isBlockSaved, saveBlockData } from './ddb/block-data';
import { DRAIN_BLOCK_QUEUE_LAMBDA_NAME, NEW_BLOCK_QUEUE_NAME, NUM_BLOCKS_DELAY, REWIND_BLOCK_LOOKBACK } from './env';
import { Lambda } from 'aws-sdk';
import getNextFetchBlock from './get-next-fetch-block';
import { notifyQueueOfBlock } from './sqs/sqs-util';
import { getBlockStreamState, saveBlockStreamState } from './ddb/blockstream-state';
import { BlockWithTransactionHashes, Log, TransactionReceipt } from '../client/model';
import ValidatedEthClient from './validated-eth-client';
import rewindOneBlock from './rewind-one-block';

const lambda = new Lambda();

/**
 * This function is executed on a loop and reconciles one block worth of data
 */
export default async function reconcileBlock(client: ValidatedEthClient): Promise<void> {
  const state = await getBlockStreamState();

  // we have a configurable block delay which lets us reduce the frequency fo chain reorgs
  // as well as other harmless errors due to delays in node data indexing
  const currentBlockNo: BigNumber = (await client.eth_blockNumber()).minus(NUM_BLOCKS_DELAY);

  const nextFetchBlock: BigNumber = await getNextFetchBlock(state, currentBlockNo, REWIND_BLOCK_LOOKBACK);

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
    logger.debug({ err, currentBlockNo }, 'failed to get current block by number');
    return;
  }

  logger.debug({ blockHash: block.hash, transactionsCount: block.transactions.length }, 'fetching tx receipts');

  let transactionReceipts: TransactionReceipt[];
  try {
    transactionReceipts = await client.eth_getTransactionReceipts(block.transactions);
  } catch (err) {
    logger.debug({ blockNumber: block.number, blockHash: block.hash, err }, 'failed to get receipts');
    return;
  }

  const logs: Log[] = _.flatten(transactionReceipts.map(receipt => receipt.logs), true);

  const metadata = {
    state,
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
    return;
  }

  if (_.any(logs, ({ removed }) => removed)) {
    logger.error({ metadata }, 'block received with a log already marked removed');
    return;
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
        await rewindOneBlock(state, metadata);
        logger.info({ metadata }, 'successfully rewound');
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

  try {
    await notifyQueueOfBlock(block, false);
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
    await saveBlockStreamState(state, block);
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
