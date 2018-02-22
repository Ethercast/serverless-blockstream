export interface Transaction {
  hash: string;
  nonce: string;
  blockHash: string;
  blockNumber: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
}

export interface Block {
  difficulty: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
  hash: string;
  logsBloom: string;
  miner: string;
  mixHash: string;
  nonce: string;
  number: string;
  parentHash: string;
  receiptsRoot: string;
  sha3Uncles: string;
  size: string;
  stateRoot: string;
  timestamp: string;
  totalDifficulty: string;
  transactionsRoot: string;
  uncles: string[];
}

export interface BlockWithTransactionHashes extends Block {
  transactions: string[];
}

export interface BlockWithFullTransactions extends Block {
  transactions: Transaction[];
}

export interface LogFilter {
  topics: (string | string[])[];
  fromBlock: string | BigNumber | number | 'latest' | 'earliest' | 'pending';
  toBlock: string | BigNumber | number | 'latest' | 'earliest' | 'pending';
  address: string;
}