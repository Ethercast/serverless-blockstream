import * as WebSocket from 'ws';
import { BlockWithFullTransactions, BlockWithTransactionHashes, LogFilter, TransactionReceipt } from 'ethercast-model';
import BigNumber from 'bignumber.js';
import logger from '../util/logger';
import { buildRequest, MethodParameter } from './util';
import EthClient, { BlockParameter, Method } from './eth-client';

export default class EthWSClient implements EthClient {
  ws: WebSocket;

  constructor({ ws }: { ws: WebSocket }) {
    this.ws = ws;
  }

  web3_clientVersion = () => this.cmd<string>(Method.web3_clientVersion);

  public eth_getBlockByHash(hash: string, includeFullTransactions: false): Promise<BlockWithTransactionHashes>;

  public eth_getBlockByHash(hash: string, includeFullTransactions: true): Promise<BlockWithFullTransactions>;
  public eth_getBlockByHash(hash: string, includeFullTransactions: boolean): any {
    return this.cmd<BlockWithFullTransactions | BlockWithTransactionHashes>(Method.eth_getBlockByHash, hash, includeFullTransactions)
      .then(
        block => {
          if (block === null) {
            throw new Error('block by number does not exist');
          }

          return block;
        }
      );
  }

  public eth_getBlockByNumber(blockNumber: BlockParameter, includeFullTransactions: false): Promise<BlockWithTransactionHashes>;

  public eth_getBlockByNumber(blockNumber: BlockParameter, includeFullTransactions: true): Promise<BlockWithFullTransactions>;
  public eth_getBlockByNumber(blockNumber: BlockParameter, includeFullTransactions: boolean): any {
    return this.cmd<BlockWithFullTransactions | BlockWithTransactionHashes | null>(Method.eth_getBlockByNumber, blockNumber, includeFullTransactions)
      .then(
        block => {
          if (block === null) {
            throw new Error('block by number does not exist');
          }

          return block;
        }
      );
  }

  public eth_blockNumber = () => this.cmd<string>(Method.eth_blockNumber).then(s => new BigNumber(s));

  public eth_getLogs = (filter: LogFilter) => this.cmd<any>(Method.eth_getLogs, filter);

  public net_version(): Promise<number> {
    return this.cmd<string>(Method.net_version).then(s => parseInt(s));
  }

  public eth_getTransactionReceipt(hash: string): Promise<TransactionReceipt> {
    return this.cmd<TransactionReceipt>(Method.eth_getTransactionReceipt, hash);
  }

  public eth_getTransactionReceipts(hash: string[]): Promise<TransactionReceipt[]> {
    // this is cheaper over websockets
    return Promise.all(hash.map(this.eth_getTransactionReceipt));
  }

  private async cmd<TResponse>(method: Method, ...params: MethodParameter[]): Promise<TResponse> {
    const { ws } = this;

    if (ws.readyState !== ws.OPEN) {
      throw new Error('websocket is not open!');
    }

    return new Promise<any>((resolve, reject) => {
      const request = buildRequest(method, params);

      let resolved = false;

      const listener = function (event: { data: any; type: string; target: WebSocket }): void {
        logger.debug({ type: event.type, data: event.data }, 'received event');

        if (event.type === 'message') {
          try {
            const msgData = JSON.parse(event.data);

            if (msgData.id === request.id) {
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
