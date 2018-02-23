import logger from './logger';
import BigNumber from 'bignumber.js';
import * as _ from 'underscore';
import saveBlockData, { blockExists, getBlockStreamState, saveBlockStreamState } from './save-block-data';
import EthClient, { BlockParameter } from '../client/eth-client';
import { NETWORK_ID, SQS_BLOCK_RECEIVED_QUEUE_URL, STARTING_BLOCK } from './env';
import { SQS } from 'aws-sdk';
import { BlockStreamState, BlockWithTransactionHashes, Log } from './model';

const sqs = new SQS();

/**
 * Get the number of the next block to fetch
 */
async function getNextFetchBlock(state: BlockStreamState | null): Promise<BigNumber> {
  if (!state) {
    return new BigNumber(STARTING_BLOCK);
  }

  const lastBlockNo = new BigNumber(state.lastReconciledBlock.number);

  if (lastBlockNo.gt(STARTING_BLOCK)) {
    return lastBlockNo.plus(1);
  }

  return new BigNumber(STARTING_BLOCK);
}

function toHex(number: BlockParameter): string {
  if (typeof number === 'string' && number.indexOf('0x') === 0) {
    return number;
  } else if (typeof number === 'number') {
    return `0x${number.toString(16)}`;
  } else if (typeof number === 'string' && /^[0-9]+$/.test(number)) {
    return `0x${parseInt(number).toString(16)}`;
  } else if (number instanceof BigNumber) {
    return `0x${number.toString(16)}`;
  } else {
    throw new Error(`did not understand number type: ${number}`);
  }
}

/**
 * This function is executed on a loop and reconciles one block worth of data
 */
export default async function reconcileBlocks(client: EthClient): Promise<void> {
  let state = await getBlockStreamState();
  const nextFetchBlock = await getNextFetchBlock(state);
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

  logger.info({
    blockHash: block.hash,
    number: block.number,
    logCount: logs.length
  }, 'fetched block');

  // if any logs are not for this block, we encountered a race condition, try again later. log everything
  // since this rarely happens
  if (_.any(logs, ({ blockHash }) => blockHash !== block.hash)) {
    logger.warn({ blockHash: block.hash, logCount: logs.length }, 'inconsistent logs: not all logs matched the block');
    logger.debug({ block, logs }, 'inconsistent logs');
    return;
  }


  //  check if the parent exists and rewind blocks if it does
  {
    const parentBlockNumber = toHex(new BigNumber(block.number).minus(1));
    const parentExists = await blockExists(block.parentHash, parentBlockNumber);

    if (!parentExists && state) {
      logger.warn({
        blockHash: block.hash,
        blockNumber: block.number,
        parentHash: block.parentHash,
        parentBlockNumber
      }, 'parent exists! do not know how to rewind blocks yet');
      // TODO: update the state to point at the last reconciled block that is still on-chain
      return;
    }
  }

  // TODO: should this thing also check parent exists?
  await saveBlockData(block, logs, state !== null);

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
    logger.error({ err }, 'failed to deliver block notification message to queue');
    return;
  }

  // LAST step: save the blockstream state
  state = await saveBlockStreamState({
    lastReconciledBlock: {
      hash: block.hash,
      number: block.number
    },
    network_id: NETWORK_ID
  });

}
