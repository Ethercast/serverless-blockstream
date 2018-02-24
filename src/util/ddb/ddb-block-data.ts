import { BlockWithTransactionHashes, DecodedBlockPayload, Log } from '../model';
import logger from '../logger';
import { BLOCK_DATA_TTL_MS, BLOCKS_TABLE } from '../env';
import { DynamoDB } from 'aws-sdk';
import toHex, { BlockNumber } from '../to-hex';
import BigNumber from 'bignumber.js';
import { deflatePayload, inflatePayload } from '../compress';

const ddbClient = new DynamoDB.DocumentClient();

const BLOCK_TABLE_BLOCK_NUMBER_INDEX_NAME = 'ByBlockNumber';

export function getBlockDataTtl(): number {
  return (new Date()).getTime() + BLOCK_DATA_TTL_MS;
}

export async function blockExists(hash: string, number: BlockNumber): Promise<boolean> {
  const { Item } = await ddbClient.get({
    TableName: BLOCKS_TABLE,
    Key: {
      hash,
      number: toHex(number)
    },
    AttributesToGet: ['hash', 'number']
  }).promise();

  return !!(Item && Item.hash === hash && Item.number === toHex(number));
}

export async function getBlocksMatchingNumber(number: BlockNumber): Promise<DecodedBlockPayload[]> {
  logger.debug({ number }, 'getting blocks matching number');

  let blockKeys;

  try {
    const { ConsumedCapacity, Count, Items } = await ddbClient.query({
      TableName: BLOCKS_TABLE,
      IndexName: BLOCK_TABLE_BLOCK_NUMBER_INDEX_NAME,
      KeyConditionExpression: '#number = :number',
      ExpressionAttributeNames: {
        '#number': 'number'
      },
      ExpressionAttributeValues: {
        ':number': toHex(number)
      },
      ReturnConsumedCapacity: 'TOTAL'
    }).promise();
    logger.debug({ ConsumedCapacity, Count, number }, 'got blocks matching number');

    if (!Items) {
      return [];
    }

    if (Items.length !== Count) {
      throw new Error('getBlocksMatchingNumber does not support getting a paginated result set');
    }

    // now we need to get all the actual blocks from the table
    blockKeys = Items;
  } catch (err) {
    logger.error({ err }, 'failed to get keys');
    throw err;
  }

  const decodedBlocks: DecodedBlockPayload[] = [];

  let requestItems: DynamoDB.DocumentClient.BatchGetRequestMap = {
    [BLOCKS_TABLE]: {
      Keys: blockKeys,
      ProjectionExpression: 'payload'
    }
  };

  while (true) {
    const { ConsumedCapacity, Responses, UnprocessedKeys } = await ddbClient.batchGet({
      ReturnConsumedCapacity: 'TOTAL',
      RequestItems: requestItems
    }).promise();

    logger.debug({ requestItems, ConsumedCapacity, UnprocessedKeys }, 'fetched payloads for blocks');

    if (!Responses) {
      throw new Error('no responses from the batch get!');
    }

    // process the blocks into the return array
    for (let i = 0; i < Responses[BLOCKS_TABLE].length; i++) {
      const { payload } = Responses[BLOCKS_TABLE][i];

      const decoded: DecodedBlockPayload = await inflatePayload(payload);

      decodedBlocks.push(decoded);
    }

    if (UnprocessedKeys && UnprocessedKeys[BLOCKS_TABLE] && UnprocessedKeys[BLOCKS_TABLE].Keys && UnprocessedKeys[BLOCKS_TABLE].Keys.length > 0) {
      requestItems = UnprocessedKeys;
    } else {
      break;
    }
  }

  return decodedBlocks;
}

async function putBlock(block: BlockWithTransactionHashes, logs: Log[]) {
  logger.debug({ hash: block.hash, number: block.number }, 'compressing block and logs');
  const payload = await deflatePayload(block, logs);

  logger.info({ hash: block.hash, number: block.number, payloadSize: payload.length }, 'compressed payload length');

  // when this data expires
  const ttl = getBlockDataTtl();

  // save the individual block
  return ddbClient.put(
    {
      TableName: BLOCKS_TABLE,
      Item: {
        hash: block.hash,
        number: block.number,
        parentHash: block.parentHash,
        ttl,
        payload
      },
      ReturnConsumedCapacity: 'TOTAL'
    }
  ).promise();
}

export async function saveBlockData(block: BlockWithTransactionHashes, logs: Log[], checkParentExists: boolean): Promise<void> {
  const metadata = {
    blockHash: block.hash,
    blockNumber: block.number,
    txCount: block.transactions.length,
    logCount: logs.length,
    parentHash: block.parentHash
  };

  if (checkParentExists) {
    logger.info({ metadata }, 'checking for existence of parent hash');

    const parentExists = await blockExists(
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
    const { ConsumedCapacity } = await putBlock(block, logs);

    logger.info({ metadata, ConsumedCapacity }, 'completed block save operation');
  } catch (err) {
    logger.error({ err, metadata }, 'failed to save block');
    throw err;
  }

}
