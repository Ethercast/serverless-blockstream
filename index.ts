import WebSocket = require('ws');
import Client from './client';
import logger from './logger';

const { NODE_URL } = process.env;

const ws = new WebSocket(NODE_URL || 'wss://mainnet.infura.io/ws');

const START_TIME = (new Date()).getTime();

function runtime() {
  return (new Date()).getTime() - START_TIME;
}

const client = new Client({ ws });

ws.on('open', async () => {
  const clientVersion = await client.web3_clientVersion([]);
  logger.info('client version', clientVersion);

  async function loop() {
    const blockNumber = await client.eth_blockNumber([]);
    logger.info(`retrieved latest block number: ${blockNumber}`);

    const block = await client.eth_getBlockByNumber([blockNumber, false]);
    logger.debug(`fetched block`, block);
  }

  setInterval(() => {
    loop().catch(
      err => {
        logger.error({ msg: `error encountered in loop after ${runtime()}ms`, err });
      }
    );
  }, 1000);


  // close the socket on exit
  process.on('exit', () => {
    ws.close();
  });
});
