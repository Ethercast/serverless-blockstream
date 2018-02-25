import { BlockWithFullTransactions, BlockWithTransactionHashes, Log, LogFilter, TransactionReceipt } from './model';
import BigNumber from 'bignumber.js';

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

export default interface EthClient {
  net_version(): Promise<number>;

  web3_clientVersion(): Promise<string>;

  eth_getBlockByHash(hash: string, includeFullTransactions: false): Promise<BlockWithTransactionHashes | null>;

  eth_getBlockByHash(hash: string, includeFullTransactions: true): Promise<BlockWithFullTransactions | null>;

  eth_getBlockByNumber(block: BlockParameter, includeFullTransactions: false): Promise<BlockWithTransactionHashes | null>;

  eth_getBlockByNumber(block: BlockParameter, includeFullTransactions: true): Promise<BlockWithFullTransactions | null>;

  eth_blockNumber(): Promise<BigNumber>;

  eth_getLogs(filter: LogFilter): Promise<Log[]>;

  eth_getTransactionReceipt(hash: string): Promise<TransactionReceipt>;

  eth_getTransactionReceipts(hash: string[]): Promise<TransactionReceipt[]>;
}
