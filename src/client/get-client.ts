import * as WebSocket from 'ws';
import EthClient from './eth-client';
import EthWsClient from './eth-ws-client';
import EthHttpsClient from './eth-https-client';
import * as Logger from 'bunyan';

export default async function getClient(logger: Logger, nodeUrl: string): Promise<EthClient> {
  if (!nodeUrl) {
    throw new Error('missing node url');
  }

  if (nodeUrl.toLowerCase().indexOf('https:/') === 0) {
    return new EthHttpsClient({ logger, endpointUrl: nodeUrl });
  } else if (nodeUrl.toLowerCase().indexOf('wss:/') === 0) {
    const ws = new WebSocket(nodeUrl);

    return new Promise<EthWsClient>((resolve, reject) => {
      let opened = false;

      ws.on('open', () => {
        opened = true;
        resolve(new EthWsClient({ logger, ws }));
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
