import WebSocket = require('ws');
import Client from './client';
import logger from './logger';
import * as _ from 'underscore';
import BigNumber from 'bignumber.js';

const { NODE_URL } = process.env;
const NUM_BLOCK_LOOKBACK = 1;

const ws = new WebSocket(NODE_URL || 'wss://mainnet.infura.io/ws');

const START_TIME = (new Date()).getTime();

function runtime() {
  return (new Date()).getTime() - START_TIME;
}

const client = new Client({ ws });

ws.on('open', async () => {
  const clientVersion = await client.web3_clientVersion();
  logger.info('client version', clientVersion);

  // TODO: pull latest block number out of dynamo
  let lastReconciledBlockNumber: BigNumber = new BigNumber(0);

  // whether we have an executing loop function
  let locked = false;

  async function loop() {
    if (locked) {
      logger.debug('loop skipped due to lock');
      return;
    }

    locked = true;
    logger.debug('loop is now locked');

    const latestBlockNumber = await client.eth_blockNumber();
    logger.debug({ latestBlockNumber, lastReconciledBlockNumber }, 'retrieved latest block number');

    let numMissingBlocks = latestBlockNumber.minus(lastReconciledBlockNumber);
    if (numMissingBlocks.gt(NUM_BLOCK_LOOKBACK)) {
      numMissingBlocks = new BigNumber(NUM_BLOCK_LOOKBACK);
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

      // TODO: reconcile/store block information

      lastReconciledBlockNumber = missingBlockNumbers[i];
    }

    locked = false;
    logger.debug('loop is now unlocked');
  }

  const interval = setInterval(() => {
    loop().catch(
      err => {
        logger.error({ runtime: runtime(), err }, 'error encountered');
        // locked = false;
      }
    );
  }, 1000);

  ws.on('error', (error) => {
    logger.fatal({ msg: 'websocket error' }, error);
  });

  ws.on('close', (code, reason) => {
    logger.info({ msg: 'websocket closed', code, reason });
    process.exit(1);
  });

  const exit = _.once(function () {
    logger.info('caught interrupt signal');

    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'terminated by process');
    }

    clearInterval(interval);
    process.exit(0);
  });

  process.on('SIGINT', exit);
  process.on('exit', exit);
});
