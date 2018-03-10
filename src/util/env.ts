import * as env from 'env-var';
import { LogLevel } from 'bunyan';

export const SRC_NODE_URL: string = env.get('SRC_NODE_URL').required().asUrlString();
export const NETWORK_ID: number = env.get('NETWORK_ID').required().asIntPositive();

export const LOG_LEVEL: LogLevel = env.get('LOG_LEVEL').required().asString() as LogLevel;

export const BLOCK_DATA_TTL_MS: number = env.get('BLOCK_DATA_TTL_MS').required().asIntPositive();

// OWNED RESOURCES
export const BLOCKS_TABLE: string = env.get('BLOCKS_TABLE').required().asString();
export const BLOCKSTREAM_STATE_TABLE: string = env.get('BLOCKSTREAM_STATE_TABLE').required().asString();
export const ABI_TABLE: string = env.get('ABI_TABLE').required().asString();

export const NEW_BLOCK_QUEUE_NAME: string = env.get('NEW_BLOCK_QUEUE_NAME').required().asString();
export const LOG_FIREHOSE_QUEUE_NAME: string = env.get('LOG_FIREHOSE_QUEUE_NAME').required().asString();
export const TRANSACTION_FIREHOSE_QUEUE_NAME: string = env.get('TRANSACTION_FIREHOSE_QUEUE_NAME').required().asString();

export const DRAIN_BLOCK_QUEUE_LAMBDA_NAME: string = env.get('DRAIN_BLOCK_QUEUE_LAMBDA_NAME').required().asString();

export const NUM_BLOCKS_DELAY: number = env.get('NUM_BLOCKS_DELAY').required().asIntPositive();

export const REWIND_BLOCK_LOOKBACK: number = env.get('REWIND_BLOCK_LOOKBACK').required().asIntPositive();

export const ETHERSCAN_API_URL: string = env.get('ETHERSCAN_API_URL').required().asUrlString();
export const ETHERSCAN_API_KEY: string = env.get('ETHERSCAN_API_KEY').required().asString();
