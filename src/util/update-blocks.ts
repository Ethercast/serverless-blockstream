import logger from './logger';
import BigNumber from 'bignumber.js';
import * as _ from 'underscore';
import saveBlockData, { getBlockStreamState, saveBlockStreamState } from './save-block-data';
import EthClient from '../client/eth-client';
import { NETWORK_ID, NUM_BLOCKS_PER_LOOP, SQS_BLOCK_RECEIVED_QUEUE_URL, STARTING_BLOCK } from './env';
import { SQS } from 'aws-sdk';

const sqs = new SQS();

async function getStartingBlock(): Promise<BigNumber> {
  const state = await getBlockStreamState();
  if (!state) {
    return new BigNumber(STARTING_BLOCK);
  }

  const lastBlockNo = new BigNumber(state.lastReconciledBlock.number);

  if (lastBlockNo.gt(STARTING_BLOCK)) {
    return lastBlockNo.plus(1);
  }

  return new BigNumber(STARTING_BLOCK);
}

/**
 * This function is executed on a loop and fetches the blocks since the last known block number and shoves them into dynamo
 */
export default async function updateBlocks(client: EthClient) {
  const startingBlockNo = await getStartingBlock();
  const currentBlockNo = await client.eth_blockNumber();

  if (currentBlockNo.lt(startingBlockNo)) {
    logger.info({
      currentBlockNo,
      startingBlockNo
    }, 'starting block is greater than current block, skipping iteration');
    return;
  }

  let endingBlockNo = startingBlockNo.plus(NUM_BLOCKS_PER_LOOP);
  if (endingBlockNo.gt(currentBlockNo)) {
    endingBlockNo = currentBlockNo;
  }

  let blockNumber = startingBlockNo;

  // fetch the blocks
  while (blockNumber.lte(endingBlockNo)) {
    logger.info({ blockNumber, endingBlockNo }, 'fetching block');

    // get the block info and all the logs for the block
    const [block, logs] = await Promise.all([
      client.eth_getBlockByNumber(blockNumber, false),
      client.eth_getLogs({ fromBlock: blockNumber, toBlock: blockNumber })
    ]);

    // missing block, try again later
    if (block === null) {
      logger.debug({ blockNumber }, 'block came back as null');
      break;
    }

    logger.info({ blockHash: block.hash, number: block.number, logCount: logs.length }, 'fetched missing block');

    // if any logs are not for this block, we encountered a race condition, try again later. log everything
    // since this rarely happens
    if (_.any(logs, ({ blockHash }) => blockHash !== block.hash)) {
      logger.info({ block, logs }, 'inconsistent logs: not all logs matched the block');
      break;
    }

    await saveBlockData(block, logs);

    try {
      const { MessageId } = await sqs.sendMessage({
        QueueUrl: SQS_BLOCK_RECEIVED_QUEUE_URL,
        MessageGroupId: '1',
        MessageDeduplicationId: block.hash,
        MessageBody: JSON.stringify({ hash: block.hash, number: block.number })
      }).promise();
      logger.debug({ MessageId });
    } catch (err) {
      logger.error({ err }, 'failed to deliver block notification message to queue');
      break;
    }

    // LAST step: save the blockstream state
    await saveBlockStreamState({
      lastReconciledBlock: {
        hash: block.hash,
        number: block.number
      },
      network_id: NETWORK_ID
    });

    blockNumber = new BigNumber(block.number).plus(1);
  }
}
