import WebSocket = require('ws');
import { Block } from './Block';
import BigNumber from 'bignumber.js';

export enum Method {
  web3_clientVersion = 'web3_clientVersion',
  eth_getBlockByHash = 'eth_getBlockByHash',
  eth_blockNumber = 'eth_blockNumber',
  eth_getBlockByNumber = 'eth_getBlockByNumber',
}

type MethodParameter = boolean | string | number | BigNumber;

export default class EthWSClient {
  ws: WebSocket;
  nextRequestId: number = 1;

  constructor({ ws }: { ws: WebSocket }) {
    this.ws = ws;
  }

  web3_clientVersion = this.createMethod<string>(Method.web3_clientVersion);
  eth_getBlockByHash = this.createMethod<Block, [string | BigNumber, boolean]>(Method.eth_getBlockByHash);
  eth_getBlockByNumber = this.createMethod<Block, [string | BigNumber | 'earliest' | 'latest' | 'pending', boolean]>(Method.eth_getBlockByNumber);
  eth_blockNumber = this.createMethod<string>(Method.eth_blockNumber);

  private createMethod<TResponse, TParams extends [void] = [void]>(method: Method): (params: TParams) => Promise<TResponse> {
    return function (params: TParams) {
      return this.cmd<TResponse>(method, params);
    };
  }

  private async cmd<TResponse>(method: Method, params: MethodParameter[] = []): Promise<TResponse> {
    let requestId = this.nextRequestId++;
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
            reject(`failed to parse message response`);
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
              p => (
                p instanceof BigNumber ?
                  p.toString(16) :
                  String(p)
              )
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
