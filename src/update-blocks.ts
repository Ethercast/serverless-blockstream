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
    const block = await client.eth_getBlockByNumber(missingBlockNumbers[i], true);

    if (block === null) {
      logger.debug({ blockNumber: missingBlockNumbers[i] }, 'block came back as null');
      break;
    }

    // TODO: get the logs for the transactions in the block and put those in the logs table
    // before putting the block in the table
    // DO this so that we have all the logs in dynamo before an event is triggered for an added block

    // const { transactions } = block;
    //
    // if (transactions.length === 0 || typeof transactions[0] === 'string') {
    //   logger.error({ transactions: block.transactions }, 'invalid transactions: expected objects');
    //   throw new Error('invaild transactions: expected object but found string');
    // }
    //
    // const txs = transactions as Transaction[];
    //
    // logger.info({ blockHash: block.hash, number: block.number }, 'fetched missing block');
    //
    // const logs = await client.eth_getLogs({
    //   fromBlock: block.number,
    //   toBlock: block.number
    // });

    logger.debug({}, `fetched logs for ${block.number}`);

    await saveBlockData(block);

    lastReconciledBlockNumber = missingBlockNumbers[i];
  }
}
