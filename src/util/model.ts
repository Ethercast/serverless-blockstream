import { BlockWithTransactionHashes, Log } from '../client/model';

export interface BlockStreamState {
  networkId: number;
  blockHash: string;
  blockNumber: string;
  timestamp: number;
  index: number;
  history: Pick<BlockStreamState, 'blockHash' | 'blockNumber' | 'timestamp' | 'index'>[];
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
  payload: Buffer;
}

export interface DecodedBlockPayload {
  block: BlockWithTransactionHashes;
  logs: Log[];
}
