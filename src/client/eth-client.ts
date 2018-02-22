import { BlockWithFullTransactions, BlockWithTransactionHashes, Log, LogFilter } from '../model';
import BigNumber from 'bignumber.js';
import * as _ from 'underscore';

export enum Method {
  web3_clientVersion = 'web3_clientVersion',
  eth_getBlockByHash = 'eth_getBlockByHash',
  eth_blockNumber = 'eth_blockNumber',
  eth_getBlockByNumber = 'eth_getBlockByNumber',
  eth_getLogs = 'eth_getLogs',
}

type MethodParameter = boolean | string | number | BigNumber | object;

function serializeToMethodParameter(p: any): MethodParameter {
  switch (typeof p) {
    case 'object':
      if (p instanceof BigNumber) {
        return `0x${p.toString(16)}`;
      }

      if (Array.isArray(p)) {
        return _.map(p, serializeToMethodParameter);
      }

      return _.mapObject(p, serializeToMethodParameter);
    case 'string':
      return p;
    case 'number':
      return `0x${new BigNumber(p).toString(16)}`;
    case 'boolean':
      return p;

    default:
      throw new Error('unhandled type');
  }
}

export type BlockParameter = string | BigNumber | 'earliest' | 'latest' | 'pending'

export default interface EthClient {
  web3_clientVersion(): Promise<string>;

  eth_getBlockByHash(hash: string, includeFullTransactions: false): Promise<BlockWithTransactionHashes | null>;

  eth_getBlockByHash(hash: string, includeFullTransactions: true): Promise<BlockWithFullTransactions | null>;

  eth_getBlockByNumber(block: BlockParameter, includeFullTransactions: false): Promise<BlockWithTransactionHashes | null>;

  eth_getBlockByNumber(block: BlockParameter, includeFullTransactions: true): Promise<BlockWithFullTransactions | null>;

  eth_blockNumber(): Promise<BigNumber>;

  eth_getLogs(filter: LogFilter): Promise<Log[]>;
}
