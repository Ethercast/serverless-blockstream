import { DecodedBlockPayload, DynamoBlock } from '../model';
import logger from '../logger';
import { BLOCK_DATA_TTL_MS, BLOCKS_TABLE } from '../env';
import toHex, { BlockNumber } from '../to-hex';
import BigNumber from 'bignumber.js';
import { deflatePayload, inflatePayload } from '../compress';
import {
  BlockWithFullTransactions,
  mustBeValidBlockWithFullTransactions,
  mustBeValidTransactionReceipt,
  TransactionReceipt
} from '@ethercast/model';
import { ddbClient } from './shared';

export function getBlockDataTtl(): number {
  return Math.round(((new Date()).getTime() + BLOCK_DATA_TTL_MS) / 1000);
}

export async function isBlockSaved(hash: string, number: BlockNumber): Promise<boolean> {
  try {
    await getBlockMetadata(hash, number);
  } catch (err) {
    return false;
  }

  return true;
}

export type BlockMetadata = Pick<DynamoBlock, 'hash' | 'number' | 'parentHash'>;

export async function getBlockMetadata(hash: string, number: BlockNumber): Promise<BlockMetadata> {
  const { Item } = await ddbClient.get({
    TableName: BLOCKS_TABLE,
    Key: {
      hash,
      number: toHex(number)
    },
    ProjectionExpression: '#hash, #number, #parentHash',
    ExpressionAttributeNames: {
      '#hash': 'hash',
      '#number': 'number',
      '#parentHash': 'parentHash'
    }
  }).promise();

  const block = Item as BlockMetadata;

  if (!block || block.hash !== hash || block.number !== toHex(number) || !block.parentHash) {
    throw new Error(`getBlockMetadata: invalid block passed: hash ${hash} && #${new BigNumber(number).valueOf()}`);
  }

  return block;
}

export async function getBlock(hash: string, number: string): Promise<DecodedBlockPayload> {
  logger.debug({ hash, number }, 'getting block payload from dynamo');

  try {
    const { Item, ConsumedCapacity } = await ddbClient.get({
      TableName: BLOCKS_TABLE,
      ConsistentRead: true,
      Key: {
        hash,
        number: toHex(number)
      },
      ReturnConsumedCapacity: 'TOTAL'
    }).promise();

    const block = Item as DynamoBlock;

    if (!block || block.hash !== hash || block.number !== number) {
      throw new Error(`failed to get block, invalid/missing hash or invalid/missing number returned from dynamo`);
    }

    logger.debug({ hash, number, ConsumedCapacity }, 'got block');

    return inflatePayload(block.payload);
  } catch (err) {
    logger.error({ hash, number, err }, 'failed to get block from dynamo');
    throw err;
  }
}

async function putBlock(block: BlockWithFullTransactions, receipts: TransactionReceipt[]) {
  logger.debug({ hash: block.hash, number: block.number }, 'compressing block and logs');
  const payload = await deflatePayload(block, receipts);

  logger.debug({
    hash: block.hash,
    number: block.number,
    payloadSize: payload.length
  }, 'compressed payload buffer size');

  // when this data expires
  const ttl = getBlockDataTtl();

  const Item: DynamoBlock = {
    hash: block.hash,
    number: block.number,
    parentHash: block.parentHash,
    ttl,
    payload
  };

  // save the individual block
  return ddbClient.put(
    {
      TableName: BLOCKS_TABLE,
      Item,
      ReturnConsumedCapacity: 'TOTAL'
    }
  ).promise();
}

export async function saveBlockData(notValidatedBlock: BlockWithFullTransactions, notValidatedReceipts: TransactionReceipt[], checkParentExists: boolean): Promise<void> {
  const block = mustBeValidBlockWithFullTransactions(notValidatedBlock);
  const receipts = notValidatedReceipts.map(mustBeValidTransactionReceipt);

  const metadata = {
    blockHash: block.hash,
    blockNumber: block.number,
    txCount: block.transactions.length,
    receiptCount: receipts.length,
    parentHash: block.parentHash
  };

  if (checkParentExists) {
    logger.info({ metadata }, 'checking for existence of parent hash');

    const parentExists = await isBlockSaved(
      block.parentHash,
      new BigNumber(block.number).minus(1)
    );

    if (!parentExists) {
      logger.error({ metadata }, 'parent hash did not exist');
      throw new Error('parent block check failed');
    }
  }

  try {
    // save the individual block
    const { ConsumedCapacity } = await putBlock(block, receipts);

    logger.info({ metadata, ConsumedCapacity }, 'completed block save operation');
  } catch (err) {
    logger.error({ err, metadata }, 'failed to save block');
    throw err;
  }

}
