import * as env from 'env-var';
import { LogLevel } from 'bunyan';

export const SRC_NODE_URL: string = env.get('SRC_NODE_URL').required().asUrlString();
export const NETWORK_ID: number = env.get('NETWORK_ID').required().asIntPositive();

export const LOG_LEVEL: LogLevel = env.get('LOG_LEVEL').required().asString() as LogLevel;

export const STARTING_BLOCK: number = env.get('STARTING_BLOCK').required().asIntPositive();

export const BLOCK_DATA_TTL_MS: number = env.get('BLOCK_DATA_TTL_MS').required().asIntPositive();

// OWNED RESOURCES
export const BLOCKS_TABLE: string = env.get('BLOCKS_TABLE').required().asString();
// export const LOGS_TABLE: string = env.get('LOGS_TABLE').required().asString();
export const BLOCKSTREAM_STATE_TABLE: string = env.get('BLOCKSTREAM_STATE_TABLE').required().asString();

export const SQS_BLOCK_RECEIVED_QUEUE_NAME: string = env.get('SQS_BLOCK_RECEIVED_QUEUE_NAME').required().asString();
export const DESTINATION_LOG_QUEUE_NAME: string = env.get('DESTINATION_LOG_QUEUE_NAME').required().asString();

export const DRAIN_QUEUE_LAMBDA_NAME: string = env.get('DRAIN_QUEUE_LAMBDA_NAME').required().asString();
