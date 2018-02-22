import WebSocket = require('ws');
import EthWsClient from './eth-ws-client';
import logger from './logger';
import updateBlocks from './update-blocks';

const { WSS_NODE_URL = 'wss://mainnet.infura.io/ws' } = process.env;

export function start() {
  const ws = new WebSocket(WSS_NODE_URL);

  const client = new EthWsClient({ ws });

  ws.on('open', async () => {
    const clientVersion = await client.web3_clientVersion();
    logger.info('client version', clientVersion);

    let locked = false;

    const interval = setInterval(() => {
      if (locked) {
        return;
      }

      locked = true;

      updateBlocks(client)
        .then(
          () => {
            locked = false;
          }
        )
        .catch(
          err => {
            logger.error({ err }, 'unexpected error encountered');

            locked = false;
          }
        );
    }, 1000);


    ws.on('error', (err) => {
      logger.fatal({ err }, 'websocket error');
      process.exit(1);
    });

    ws.on('close', (code, reason) => {
      logger.info({ code, reason }, 'websocket closed');
    });

    process.on('SIGINT', function () {
      process.exit(0);
    });

    process.on('exit', function () {
      logger.info('cleaning up resources');

      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'terminated by process');
      }

      clearInterval(interval);
    });
  });
}