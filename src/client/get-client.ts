import * as WebSocket from 'ws';
import EthClient from './eth-client';
import EthWsClient from './eth-ws-client';
import EthHttpsClient from './eth-https-client';

export default async function getClient(nodeUrl: string): Promise<EthClient> {
  if (!nodeUrl) {
    throw new Error('missing node url');
  }

  if (nodeUrl.toLowerCase().startsWith('https:/')) {
    return new EthHttpsClient({ endpointUrl: nodeUrl });
  } else if (nodeUrl.toLowerCase().startsWith('wss:/')) {
    const ws = new WebSocket(nodeUrl);

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
