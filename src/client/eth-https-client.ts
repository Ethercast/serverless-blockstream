import EthClient, { BlockParameter, Method } from './eth-client';
import { BlockWithFullTransactions, BlockWithTransactionHashes, Log, LogFilter, TransactionReceipt } from './model';
import { buildRequest, MethodParameter } from './util';
import BigNumber from 'bignumber.js';
import logger from '../util/logger';
import * as fetch from 'isomorphic-fetch';

export default class EthHttpsClient implements EthClient {
  endpointUrl: string;

  constructor({ endpointUrl }: { endpointUrl: string }) {
    this.endpointUrl = endpointUrl;
  }

  public eth_getBlockByHash(hash: string, includeFullTransactions: false): Promise<BlockWithTransactionHashes>;

  public eth_getBlockByHash(hash: string, includeFullTransactions: true): Promise<BlockWithFullTransactions>;

  public eth_getBlockByHash(hash: string, includeFullTransactions: boolean): any {
    return this.cmd<BlockWithFullTransactions | BlockWithTransactionHashes>(Method.eth_getBlockByHash, [hash, includeFullTransactions])
      .then(
        block => {
          if (block === null) {
            throw new Error(`block by hash does not exist: ${hash}`);
          }

          return block;
        }
      );
  }

  public eth_getBlockByNumber(blockNumber: BlockParameter, includeFullTransactions: false): Promise<BlockWithTransactionHashes>;

  public eth_getBlockByNumber(blockNumber: BlockParameter, includeFullTransactions: true): Promise<BlockWithFullTransactions>;

  public eth_getBlockByNumber(blockNumber: BlockParameter, includeFullTransactions: boolean): any {
    return this.cmd<BlockWithFullTransactions | BlockWithTransactionHashes>(Method.eth_getBlockByNumber, [blockNumber, includeFullTransactions])
      .then(block => {
        if (block === null) {
          throw new Error(`block by number does not exist: ${blockNumber}`);
        }

        return block;
      });
  }

  public net_version(): Promise<number> {
    return this.cmd<string>(Method.net_version).then(s => parseInt(s));
  }

  public web3_clientVersion = () => this.cmd<string>(Method.web3_clientVersion);

  public eth_blockNumber = () => this.cmd<string>(Method.eth_blockNumber).then(s => new BigNumber(s));

  public eth_getLogs = (filter: LogFilter) => this.cmd<Log[]>(Method.eth_getLogs, [filter]);

  public eth_getTransactionReceipt(hash: string): Promise<TransactionReceipt> {
    return this.cmd<TransactionReceipt>(Method.eth_getTransactionReceipt, [hash])
      .then(
        receipt => {
          if (receipt === null) {
            throw new Error('invalid transaction hash');
          }

          return receipt;
        }
      );
  }

  public async eth_getTransactionReceipts(hashes: string[]): Promise<TransactionReceipt[]> {
    const results = await this.rpc<any>(
      hashes.map(
        hash => buildRequest(Method.eth_getTransactionReceipt, [hash])
      )
    );

    return results.map(
      ({ result }: { result: any }) => {
        if (typeof result === 'undefined') {
          throw new Error('inavlid response: ' + JSON.stringify(result));
        }

        if (result === null) {
          throw new Error('invalid transaction hash');
        }

        return result as TransactionReceipt;
      }
    );
  }

  private async cmd<TResponse>(method: Method, params: MethodParameter[] = []): Promise<TResponse> {
    const request = buildRequest(method, params);

    const json = await this.rpc<any>(request);

    if (typeof json.result === 'undefined') {
      logger.error({ request, responseBody: json }, 'no `result` key in the body');
      throw new Error(`failed to fetch: no result in the body`);
    }

    return json.result;
  }

  private async rpc<TResponse>(body: any): Promise<TResponse> {
    const { endpointUrl } = this;

    logger.debug({ body }, 'sending request');

    const response = await fetch(
      endpointUrl,
      {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    let bodyText: string;
    try {
      bodyText = await response.text();
    } catch (err) {
      logger.error({ err }, 'body text couldnt be extracted');
      throw err;
    }

    if (response.status !== 200) {
      logger.error({
        requestBody: body,
        responseStatus: response.status,
        responseBody: bodyText
      }, 'not 200 response from json rpc');

      throw new Error('failed to fetch: ' + response.status);
    }

    let json: any;
    try {
      json = JSON.parse(bodyText);
    } catch (err) {
      logger.error({ err, bodyText }, 'body was not valid json');
      throw err;
    }

    return json;
  }

}
