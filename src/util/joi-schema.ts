import { array, boolean, object, Schema, string } from 'joi';
import { BlockWithTransactionHashes, Log } from './model';
import logger from './logger';

const hex = string().regex(/^0x[0-9A-Fa-f]*$/).lowercase();
const hex256 = hex.length(66);
const hex160 = hex.length(42);
const hexUint = hex.max(66);

const address = hex160;
const topic = hex256;

// SHOULD BE COMPLETE
export const JoiLog = object({
  logIndex: hexUint.required(),
  blockNumber: hexUint.required(),
  blockHash: hex256.required(),
  transactionHash: hex256.required(),
  transactionIndex: hexUint.required(),
  address: address.required(),
  data: hex.required(),
  topics: array().items(topic).min(1).max(4).required(),
  removed: boolean().required()
});

export const JoiBlockWithTransactionHashes = object({
  hash: hex256.required(),
  difficulty: hex.required(),
  extraData: hex.required(),
  gasLimit: hex.required(),
  gasUsed: hex.required(),
  logsBloom: hex.required(),
  miner: address.required(),
  mixHash: hex.required(),
  nonce: hex.required(),
  number: hex.required(),
  parentHash: hex256.required(),
  receiptsRoot: hex.required(),
  sha3Uncles: hex256.required(),
  size: hex.required(),
  stateRoot: hex.required(),
  timestamp: hex.required(),
  totalDifficulty: hex.required(),
  transactionsRoot: hex256.required(),
  uncles: array().items(hex256).required()
});


export function mustBeValidLog(log: Log): Log {
  return validate(log, JoiLog);
}

export function mustBeValidBlock(block: BlockWithTransactionHashes): BlockWithTransactionHashes {
  return validate(block, JoiBlockWithTransactionHashes);
}

function validate<T>(item: T, schema: Schema): T {
  const { error, value } = schema.validate(item, { allowUnknown: true, convert: false });

  if (error && error.details && error.details.length > 0) {
    logger.error({ error, value }, 'invalid log');
    throw new Error('invalid log: ' + error.message);
  }

  return value;
}