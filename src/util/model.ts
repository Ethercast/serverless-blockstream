export interface BlockStreamState {
  lastReconciledBlock: {
    hash: string;
    number: string;
  };
  network_id: number;
}

export interface BlockQueueMessage {
  hash: string;
  number: string;
}

// what we actually store in dynamo for each block
export interface DynamoBlock {
  hash: string;
  number: string;
  parentHash: string;
  ttl: string;
  payload: string;
}

export interface DecodedBlockPayload {
  block: BlockWithTransactionHashes;
  logs: Log[];
}

export interface Log {
  logIndex: string;
  blockNumber: string;
  blockHash: string;
  transactionHash: string;
  transactionIndex: string;
  address: string;
  data: string;
  topics: string[];
  removed: boolean;
}

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
  hash: string;
  difficulty: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
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
  topics?: (string | string[])[];
  fromBlock: string | BigNumber | number | 'latest' | 'earliest' | 'pending';
  toBlock: string | BigNumber | number | 'latest' | 'earliest' | 'pending';
  address?: string;
}