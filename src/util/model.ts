import { BlockWithTransactionHashes, Log } from '../client/model';

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

