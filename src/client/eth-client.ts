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

function serializeParameter(p: any): any {
  switch (typeof p) {
    case 'object':
      if (p instanceof BigNumber) {
        return `0x${p.toString(16)}`;
      }

      if (Array.isArray(p)) {
        return _.map(p, serializeParameter);
      }

      return _.mapObject(p, serializeParameter);
    case 'string':
      return p;
    case 'number':
      return `0x${new BigNumber(p).toString(16)}`;
    case 'boolean':
      return p;
  }
}

export type BlockParameter = string | BigNumber | 'earliest' | 'latest' | 'pending'

export default interface EthClient {
  web3_clientVersion(): Promise<string>;

  eth_getBlockByHash(hash: string, includeFullTransactions: boolean): Promise<BlockWithFullTransactions | BlockWithTransactionHashes | null>;

  eth_getBlockByNumber(block: BlockParameter, includeFullTransactions: boolean): Promise<BlockWithFullTransactions | BlockWithTransactionHashes | null>;

  eth_blockNumber(): Promise<BigNumber>;

  eth_getLogs(filter: LogFilter): Promise<Log[]>;
}
