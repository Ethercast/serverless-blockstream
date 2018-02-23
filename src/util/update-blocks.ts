import logger from './logger';
import BigNumber from 'bignumber.js';
import * as _ from 'underscore';
import saveBlockData, { getBlockStreamState, saveBlockStreamState } from './save-block-data';
import EthClient from '../client/eth-client';
import { NETWORK_ID, NUM_BLOCKS_PER_LOOP, STARTING_BLOCK } from './env';

/**
 * This function is executed on a loop and fetches the blocks since the last known block number and shoves them into dynamo
 */
export default async function updateBlocks(client: EthClient) {
  let blockStreamState = await getBlockStreamState();

  let lastReconciledBlockNumber: BigNumber;
  if (!blockStreamState) {
    lastReconciledBlockNumber = new BigNumber(STARTING_BLOCK);
  } else {
    lastReconciledBlockNumber = new BigNumber(blockStreamState.lastReconciledBlock.number);
  }

  const latestBlockNumber = await client.eth_blockNumber();
  logger.debug({ latestBlockNumber, lastReconciledBlockNumber }, 'retrieved latest block number');

  let numBlocksToGet = latestBlockNumber.minus(lastReconciledBlockNumber);
  if (numBlocksToGet.gt(NUM_BLOCKS_PER_LOOP)) {
    numBlocksToGet = new BigNumber(NUM_BLOCKS_PER_LOOP);
  }

  const missingBlockNumbers = _.range(
    lastReconciledBlockNumber.toNumber(),
    lastReconciledBlockNumber.plus(numBlocksToGet).toNumber()
  );

  logger.debug({ numMissingBlocks: numBlocksToGet, missingBlockNumbers }, 'fetching missing missingBlockNumbers');

  // fetch the blocks
  for (let i = 0; i < missingBlockNumbers.length; i++) {
    // get the block info and all the logs for the block
    const [block, logs] = await Promise.all([
      client.eth_getBlockByNumber(missingBlockNumbers[i], false),
      client.eth_getLogs({ fromBlock: missingBlockNumbers[i], toBlock: missingBlockNumbers[i] })
    ]);

    // missing block, try again later
    if (block === null) {
      logger.debug({ blockNumber: missingBlockNumbers[i] }, 'block came back as null');
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

    // save the blockstream state
    await saveBlockStreamState({
      lastReconciledBlock: {
        hash: block.hash,
        number: block.number
      },
      network_id: NETWORK_ID
    });
  }
}
