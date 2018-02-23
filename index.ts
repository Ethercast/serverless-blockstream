import * as WebSocket from 'ws';
import EthWsClient from './src/client/eth-ws-client';
import EthHttpsClient from './src/client/eth-https-client';
import logger from './src/logger';
import updateBlocks from './src/update-blocks';
import { Callback, Context, Handler } from 'aws-lambda';
import EthClient from './src/client/eth-client';

const {
  RUN_TIME_LENGTH_SECONDS,
  NODE_URL
} = process.env;

let msRuntime: number = (parseInt(RUN_TIME_LENGTH_SECONDS) || 120) * 1000;
if (isNaN(msRuntime)) {
  msRuntime = 120000;
}

async function getClient(): Promise<EthClient> {
  if (!NODE_URL) {
    throw new Error('missing node url');
  }

  if (NODE_URL.toLowerCase().startsWith('https:/')) {
    return new EthHttpsClient({ endpointUrl: NODE_URL });
  } else if (NODE_URL.toLowerCase().startsWith('wss:/')) {
    const ws = new WebSocket(NODE_URL);

    return new Promise<EthWsClient>((resolve, reject) => {
      let opened = false;

      ws.on('open', () => {
        opened = true;
        resolve(new EthWsClient({ ws }));
      });

      setTimeout(
        () => {
          if (!opened) {
            reject(new Error('connection open timed out'));
          }
        },
        5000
      );
    });
  } else {
    throw new Error('unknown url protocol');
  }
}

export const start: Handler = (event: any, context: Context, cb: Callback) => {
  const START_TIME = new Date().getTime();
  const runtime = () => (new Date().getTime()) - START_TIME;

  (async () => {
    const client = await getClient();

    try {
      const clientVersion = await client.web3_clientVersion();
      logger.info({ clientVersion }, 'client version');
    } catch (err) {
      logger.error({ err }, 'client version not supported');
    }

    let locked = false;

    const interval = setInterval(() => {
      // don't interrupt it in the middle of something
      if (locked) {
        return;
      }

      if (runtime() >= msRuntime) {
        context.done();
        clearInterval(interval);
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

            context.done(err);
          }
        );
    }, 1000);

  })();
};
