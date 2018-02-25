import EthClient, { BlockParameter } from '../client/eth-client';
import {
  BlockWithFullTransactions, BlockWithTransactionHashes, Log, LogFilter,
  TransactionReceipt
} from '../client/model';
import {
  mustBeValidBlockWithFullTransactions, mustBeValidBlockWithTransactionHashes,
  mustBeValidTransactionReceipt
} from './joi-schema';

export default class ValidatedClient implements EthClient {
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

  eth_getBlockByHash(hash: string, includeFullTransactions: false): Promise<BlockWithTransactionHashes | null>;
  eth_getBlockByHash(hash: string, includeFullTransactions: true): Promise<BlockWithFullTransactions | null>;
  eth_getBlockByHash(hash: string, includeFullTransactions: boolean): any {
    if (includeFullTransactions) {
      return this.client.eth_getBlockByHash(hash, true)
        .then(block => {
          if (block === null) {
            return null;
          }

          return mustBeValidBlockWithFullTransactions(block);
        });
    } else {
      return this.client.eth_getBlockByHash(hash, false)
        .then(
          block => {
            if (block === null) {
              return null;
            }

            return mustBeValidBlockWithTransactionHashes(block);
          }
        );
    }
  }

  eth_getBlockByNumber(block: BlockParameter, includeFullTransactions: false): Promise<BlockWithTransactionHashes | null>;
  eth_getBlockByNumber(block: BlockParameter, includeFullTransactions: true): Promise<BlockWithFullTransactions | null>;
  eth_getBlockByNumber(block: BlockParameter, includeFullTransactions: boolean): any {
    if (includeFullTransactions) {
      return this.client.eth_getBlockByNumber(block, true)
        .then(block => {
          if (block === null) {
            return null;
          }

          return mustBeValidBlockWithFullTransactions(block);
        });
    } else {
      return this.client.eth_getBlockByNumber(block, false)
        .then(
          block => {
            if (block === null) {
              return null;
            }

            return mustBeValidBlockWithTransactionHashes(block);
          }
        );
    }
  }

  eth_blockNumber(): Promise<BigNumber> {
    return this.eth_blockNumber();
  }

  eth_getLogs(filter: LogFilter): Promise<Log[]> {
    return this.eth_getLogs(filter);
  }

  eth_getTransactionReceipt(hash: string): Promise<TransactionReceipt> {
    return this.eth_getTransactionReceipt(hash).then(
      receipt => mustBeValidTransactionReceipt(receipt)
    );
  }

  eth_getTransactionReceipts(hashes: string[]): Promise<TransactionReceipt[]> {
    return this.eth_getTransactionReceipts(hashes)
      .then(
        receipts => receipts.map(mustBeValidTransactionReceipt)
      );
  }

}