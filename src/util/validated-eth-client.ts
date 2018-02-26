import EthClient, { BlockParameter } from '../client/eth-client';
import {
  BlockWithFullTransactions,
  BlockWithTransactionHashes,
  Log,
  LogFilter,
  TransactionReceipt
} from '../client/model';
import {
  mustBeValidBlockWithFullTransactions,
  mustBeValidBlockWithTransactionHashes,
  mustBeValidLog,
  mustBeValidTransactionReceipt
} from './joi-schema';

export default class ValidatedEthClient implements EthClient {
  client: EthClient;

  constructor(client: EthClient) {
    this.client = client;
  }

  net_version(): Promise<number> {
    return this.client.net_version();
  }

  web3_clientVersion(): Promise<string> {
    return this.client.web3_clientVersion();
  }

  eth_getBlockByHash(hash: string, includeFullTransactions: false): Promise<BlockWithTransactionHashes>;
  eth_getBlockByHash(hash: string, includeFullTransactions: true): Promise<BlockWithFullTransactions>;
  eth_getBlockByHash(hash: string, includeFullTransactions: boolean): any {
    if (includeFullTransactions) {
      return this.client.eth_getBlockByHash(hash, true)
        .then(mustBeValidBlockWithFullTransactions);
    } else {
      return this.client.eth_getBlockByHash(hash, false)
        .then(mustBeValidBlockWithTransactionHashes);
    }
  }

  eth_getBlockByNumber(blockNumber: BlockParameter, includeFullTransactions: false): Promise<BlockWithTransactionHashes>;
  eth_getBlockByNumber(blockNumber: BlockParameter, includeFullTransactions: true): Promise<BlockWithFullTransactions>;
  eth_getBlockByNumber(blockNumber: BlockParameter, includeFullTransactions: boolean): any {
    if (includeFullTransactions) {
      return this.client.eth_getBlockByNumber(blockNumber, true)
        .then(mustBeValidBlockWithFullTransactions);
    } else {
      return this.client.eth_getBlockByNumber(blockNumber, false)
        .then(mustBeValidBlockWithTransactionHashes);
    }
  }

  eth_blockNumber(): Promise<BigNumber> {
    return this.client.eth_blockNumber();
  }

  eth_getLogs(filter: LogFilter): Promise<Log[]> {
    return this.client.eth_getLogs(filter).then(logs => logs.map(mustBeValidLog));
  }

  eth_getTransactionReceipt(hash: string): Promise<TransactionReceipt> {
    return this.client.eth_getTransactionReceipt(hash)
      .then(mustBeValidTransactionReceipt);
  }

  eth_getTransactionReceipts(hashes: string[]): Promise<TransactionReceipt[]> {
    return this.client.eth_getTransactionReceipts(hashes)
      .then(receipts => receipts.map(mustBeValidTransactionReceipt));
  }

}