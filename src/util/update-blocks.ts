import logger from './logger';
import BigNumber from 'bignumber.js';
import * as _ from 'underscore';
import saveBlockData, {
  blockExists,
  getBlockStreamState,
  saveBlockStreamState
} from './save-block-data';
import EthClient from '../client/eth-client';
import { NETWORK_ID, SQS_BLOCK_RECEIVED_QUEUE_URL, STARTING_BLOCK } from './env';
import { SQS } from 'aws-sdk';
import { BlockWithTransactionHashes, Log } from './model';
import toHex from './to-hex';
import getNextFetchBlock from './get-next-fetch-block';

const sqs = new SQS();

/**
 * This function is executed on a loop and reconciles one block worth of data
 */
export default async function reconcileBlocks(client: EthClient): Promise<void> {
  let state = await getBlockStreamState();
  const nextFetchBlock = await getNextFetchBlock(state, STARTING_BLOCK);
  const currentBlockNo = await client.eth_blockNumber();

  if (currentBlockNo.lt(nextFetchBlock)) {
    logger.info({
      currentBlockNo,
      nextFetchBlock
    }, 'starting block is greater than current block, skipping iteration');
    return;
  }

  logger.info({ currentBlockNo, nextFetchBlock }, 'fetching block');

  // get the block info and all the logs for the block
  const [block, logs]: [BlockWithTransactionHashes | null, Log[]] = await Promise.all([
    client.eth_getBlockByNumber(nextFetchBlock, false),
    client.eth_getLogs({ fromBlock: nextFetchBlock, toBlock: nextFetchBlock })
  ]);

  // missing block, try again later
  if (block === null) {
    logger.debug({ currentBlockNo, nextFetchBlock }, 'block came back as null');
    return;
  }

  const metadata = {
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


  //  check if the parent exists and rewind blocks if it does
  if (state) {
    const parentBlockNumber = toHex(new BigNumber(block.number).minus(1));
    const parentExists = await blockExists(block.parentHash, parentBlockNumber);

    if (!parentExists) {
      logger.warn({
        metadata,
        parentBlockNumber
      }, 'parent does not exist! do not know how to rewind blocks yet');

      // TODO: update the state to point at the last reconciled block that is still on-chain

      return;
    }
  }

  // TODO: should this thing also check parent exists?
  try {
    await saveBlockData(block, logs, state !== null);
  } catch (err) {
    logger.error({ err, metadata }, 'failed to save block data');
    return
  }

  try {
    const queueMessage = { hash: block.hash, number: block.number };

    const { MessageId } = await sqs.sendMessage({
      QueueUrl: SQS_BLOCK_RECEIVED_QUEUE_URL,
      MessageGroupId: '1',
      MessageDeduplicationId: block.hash,
      MessageBody: JSON.stringify(queueMessage)
    }).promise();

    logger.info({ queueMessage, MessageId }, 'placed message in queue');
  } catch (err) {
    logger.error({ err, metadata }, 'failed to deliver block notification message to queue');
    return;
  }

  try {
    // LAST step: save the blockstream state
    await saveBlockStreamState(
      state,
      {
        lastReconciledBlock: {
          hash: block.hash,
          number: block.number
        },
        network_id: NETWORK_ID
      }
    );
  } catch (err) {
    logger.error({ err, metadata }, 'failed to update blockstream state');
    return;
  }
}
