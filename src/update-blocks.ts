import logger from './logger';
import BigNumber from 'bignumber.js';
import * as _ from 'underscore';
import saveBlockData from './save-block-data';
import EthClient from './client/eth-client';

// the number of blocks to look back
const { STARTING_BLOCK = 0, MAX_NUM_BLOCKS = 5 } = process.env;

let lastReconciledBlockNumber: BigNumber = new BigNumber(STARTING_BLOCK || 0);

export default async function updateBlocks(client: EthClient) {
  const latestBlockNumber = await client.eth_blockNumber();
  logger.debug({ latestBlockNumber, lastReconciledBlockNumber }, 'retrieved latest block number');

  let numMissingBlocks = latestBlockNumber.minus(lastReconciledBlockNumber);
  if (numMissingBlocks.gt(MAX_NUM_BLOCKS)) {
    numMissingBlocks = new BigNumber(MAX_NUM_BLOCKS);
  }

  const missingBlockNumbers = _.range(0, numMissingBlocks.toNumber())
    .map(i => latestBlockNumber.minus(i))
    .reverse();
  logger.debug({ numMissingBlocks, missingBlockNumbers }, 'fetching missing missingBlockNumbers');

  // fetch the blocks
  for (let i = 0; i < missingBlockNumbers.length; i++) {
    const [block, logs] = await Promise.all([
      client.eth_getBlockByNumber(missingBlockNumbers[i], true),
      client.eth_getLogs({ fromBlock: missingBlockNumbers[i], toBlock: missingBlockNumbers[i] })
    ]);

    if (block === null) {
      logger.debug({ blockNumber: missingBlockNumbers[i] }, 'block came back as null');
      break;
    }

    // TODO: get the logs for the transactions in the block and put those in the logs table
    // before putting the block in the table
    // DO this so that we have all the logs in dynamo before an event is triggered for an added block

    logger.info({ blockHash: block.hash, number: block.number, logCount: logs.length }, 'fetched missing block');

    if (!_.all(logs, ({ blockHash }) => blockHash === block.hash)) {
      throw new Error('inconsistent logs: not all logs matched the block');
    }

    await saveBlockData(block);

    lastReconciledBlockNumber = missingBlockNumbers[i];
  }
}
