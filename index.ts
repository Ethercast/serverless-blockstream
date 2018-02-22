import * as WebSocket from 'ws';
import EthWsClient from './src/client/eth-ws-client';
import EthHttpsClient from './src/client/eth-https-client';
import parentLogger from './src/logger';
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

function getClient(): EthClient {
  if (!NODE_URL) {
    throw new Error('missing node url');
  }

  if (NODE_URL.toLowerCase().startsWith('https:/')) {
    return new EthHttpsClient({ endpointUrl: NODE_URL });
  } else if (NODE_URL.toLowerCase().startsWith('wss:/')) {
    const ws = new WebSocket(NODE_URL);

    return new EthWsClient({ ws });
  } else {
    throw new Error('unknown url protocol')
  }
}

export const start: Handler = (event: any, context: Context, cb: Callback) => {
  const client = getClient();

  const START_TIME = new Date().getTime();
  const runtime = () => (new Date().getTime()) - START_TIME;

  (async () => {
    const clientVersion = await client.web3_clientVersion();
    parentLogger.info('client version', clientVersion);

    let locked = false;

    const interval = setInterval(() => {
      if (runtime() >= msRuntime) {
        context.done();
        clearInterval(interval);
        return;
      }

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
            parentLogger.error({ err }, 'unexpected error encountered');

            locked = false;
          }
        );
    }, 1000);

  })();
};
