import { BlockWithTransactionHashes, Log } from '../client/model';

export interface BlockStreamState {
  network_id: number;
  blockHash: string;
  blockNumber: string;
  timestamp: number;
}

export interface BlockQueueMessage {
  hash: string;
  number: string;
  removed: boolean;
}

// what we actually store in dynamo for each block
export interface DynamoBlock {
  hash: string;
  number: string;
  parentHash: string;
  ttl: number;
  payload: string;
}

export interface DecodedBlockPayload {
  block: BlockWithTransactionHashes;
  logs: Log[];
}
