import WebSocket = require('ws');
import uuid = require('uuid');

export enum Method {
  web3_clientVersion = 'web3_clientVersion'
}

export default class EthWSClient {
  ws: WebSocket;

  constructor({ ws }: { ws: WebSocket }) {
    this.ws = ws;
  }

  async cmd<T>(method: Method, params: (string | number | BigNumber)[] = []): Promise<T> {
    let requestId = (new Date()).getTime();
    const { ws } = this;

    return new Promise((resolve, reject) => {
      let resolved = false;

      const listener = function (event: { data: any; type: string; target: WebSocket }): void {
        if (event.type === 'message') {
          try {
            const msgData = JSON.parse(event.data);

            if (msgData.id === requestId) {
              resolve(msgData.result);
              resolved = true;
              ws.removeEventListener('message', listener);
            }
          } catch (error) {
            console.error('unknown websocket message format', error, event.data);
          }
        }
      };

      ws.addEventListener('message', listener);

      ws.send(
        JSON.stringify(
          {
            jsonrpc: '2.0',
            id: requestId,
            method,
            params: params.map(
              p => String(p)
            )
          }
        )
      );

      setTimeout(() => {
        if (!resolved) {
          ws.removeEventListener('message', listener);
          reject(new Error('request timed out'));
        }
      }, 5000);
    });
  }
}
