import EthWSClient from './eth-ws-client';
import logger from './logger';
import BigNumber from 'bignumber.js';
import * as _ from 'underscore';

// the number of blocks to look back
const { STARTING_BLOCK = 0 } = process.env;

let lastReconciledBlockNumber: BigNumber = new BigNumber(STARTING_BLOCK || 0);

export default async function updateBlocks(client: EthWSClient) {
  const latestBlockNumber = await client.eth_blockNumber();
  logger.debug({ latestBlockNumber, lastReconciledBlockNumber }, 'retrieved latest block number');

  let numMissingBlocks = latestBlockNumber.minus(lastReconciledBlockNumber);
  if (numMissingBlocks.gt(STARTING_BLOCK)) {
    numMissingBlocks = new BigNumber(STARTING_BLOCK);
  }

  const missingBlockNumbers = _.range(0, numMissingBlocks.toNumber())
    .map(i => latestBlockNumber.minus(i))
    .reverse();
  logger.debug({ numMissingBlocks, missingBlockNumbers }, 'fetching missing missingBlockNumbers');

  // fetch the blocks
  for (let i = 0; i < missingBlockNumbers.length; i++) {
    const block = await client.eth_getBlockByNumber(missingBlockNumbers[i], false);

    if (block === null) {
      logger.debug({ blockNumber: missingBlockNumbers[i] }, 'block came back as null');
      break;
    }

    logger.info({ blockHash: block.hash, number: block.number }, 'fetched missing block');

    // TODO: put information in dynamodb

    lastReconciledBlockNumber = missingBlockNumbers[i];
  }
}