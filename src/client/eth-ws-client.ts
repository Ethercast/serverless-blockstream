import * as WebSocket from 'ws';
import { BlockWithFullTransactions, BlockWithTransactionHashes, LogFilter } from '../model';
import BigNumber from 'bignumber.js';
import logger from '../logger';
import { MethodParameter, serializeParameter } from './util';
import EthClient, { BlockParameter, Method } from './eth-client';

export default class EthWSClient implements EthClient {
  ws: WebSocket;

  nextRequestId: number = 1;

  constructor({ ws }: { ws: WebSocket }) {
    this.ws = ws;
  }

  web3_clientVersion = () => this.cmd<string>(Method.web3_clientVersion);

  public eth_getBlockByHash(hash: string, includeFullTransactions: false): Promise<BlockWithTransactionHashes | null>;
  public eth_getBlockByHash(hash: string, includeFullTransactions: true): Promise<BlockWithFullTransactions | null>;
  public eth_getBlockByHash(hash: string, includeFullTransactions: boolean): any {
    return this.cmd<BlockWithFullTransactions | BlockWithTransactionHashes>(Method.eth_getBlockByHash, [hash, includeFullTransactions]);
  }

  public eth_getBlockByNumber(block: BlockParameter, includeFullTransactions: false): Promise<BlockWithTransactionHashes | null>;
  public eth_getBlockByNumber(block: BlockParameter, includeFullTransactions: true): Promise<BlockWithFullTransactions | null>;
  public eth_getBlockByNumber(block: BlockParameter, includeFullTransactions: boolean): any {
    return this.cmd<BlockWithFullTransactions | BlockWithTransactionHashes | null>(Method.eth_getBlockByNumber, [block, includeFullTransactions]);
  }

  public eth_blockNumber = () => this.cmd<string>(Method.eth_blockNumber).then(s => new BigNumber(s));

  public eth_getLogs = (filter: LogFilter) => this.cmd<any>(Method.eth_getLogs, [filter]);

  private async cmd<TResponse>(method: Method, params: MethodParameter[] = []): Promise<TResponse> {
    const { ws } = this;

    if (ws.readyState !== ws.OPEN) {
      throw new Error('websocket is not open!');
    }

    const requestId = this.nextRequestId++;

    return new Promise<any>((resolve, reject) => {
      let resolved = false;

      const listener = function (event: { data: any; type: string; target: WebSocket }): void {
        logger.debug({ type: event.type, data: event.data }, 'received event');

        if (event.type === 'message') {
          try {
            const msgData = JSON.parse(event.data);

            if (msgData.id === requestId) {
              resolve(msgData.result);
              resolved = true;
              ws.removeEventListener('message', listener);
            }
          } catch (error) {
            reject(`failed to parse message response: ${event.data}`);
          }
        }
      };

      ws.addEventListener('message', listener);

      const request = {
        jsonrpc: '2.0',
        id: requestId,
        method,
        params: serializeParameter(params)
      };

      logger.debug({ method, request }, 'sending request');

      ws.send(JSON.stringify(request));

      setTimeout(() => {
        if (!resolved) {
          ws.removeEventListener('message', listener);
          reject(new Error('request timed out'));
        }
      }, 5000);
    });
  }
}
