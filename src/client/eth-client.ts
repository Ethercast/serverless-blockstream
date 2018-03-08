import BigNumber from 'bignumber.js';
import { BlockWithFullTransactions, BlockWithTransactionHashes, Log, TransactionReceipt } from '@ethercast/model';

export enum Method {
  web3_clientVersion = 'web3_clientVersion',
  eth_getBlockByHash = 'eth_getBlockByHash',
  eth_blockNumber = 'eth_blockNumber',
  eth_getBlockByNumber = 'eth_getBlockByNumber',
  eth_getLogs = 'eth_getLogs',
  net_version = 'net_version',
  eth_getTransactionReceipt = 'eth_getTransactionReceipt'
}

export type BlockParameter = string | number | BigNumber | 'earliest' | 'latest' | 'pending'

export interface LogFilter {
  topics?: (string | string[])[];
  fromBlock: string | BigNumber | number | 'latest' | 'earliest' | 'pending';
  toBlock: string | BigNumber | number | 'latest' | 'earliest' | 'pending';
  address?: string;
}

export default interface EthClient {
  net_version(): Promise<number>;

  web3_clientVersion(): Promise<string>;

  eth_getBlockByHash(hash: string, includeFullTransactions: false): Promise<BlockWithTransactionHashes>;

  eth_getBlockByHash(hash: string, includeFullTransactions: true): Promise<BlockWithFullTransactions>;

  eth_getBlockByNumber(blockNumber: BlockParameter, includeFullTransactions: false): Promise<BlockWithTransactionHashes>;

  eth_getBlockByNumber(blockNumber: BlockParameter, includeFullTransactions: true): Promise<BlockWithFullTransactions>;

  eth_blockNumber(): Promise<BigNumber>;

  eth_getLogs(filter: LogFilter): Promise<Log[]>;

  eth_getTransactionReceipt(hash: string): Promise<TransactionReceipt>;

  eth_getTransactionReceipts(hashes: string[]): Promise<TransactionReceipt[]>;
}
