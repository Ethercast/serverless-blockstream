import { BlockStreamState, BlockWithTransactionHashes, Log } from './model';
import logger from './logger';
import { BLOCK_DATA_TTL_MS, BLOCKS_TABLE, BLOCKSTREAM_STATE_TABLE, NETWORK_ID } from './env';
import * as zlib from 'zlib';
import { DynamoDB } from 'aws-sdk';
import toHex from './to-hex';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';

const ddbClient = new DynamoDB.DocumentClient();

export function getItemTtl(): number {
  return (new Date()).getTime() + BLOCK_DATA_TTL_MS;
}

export async function getBlockStreamState(): Promise<BlockStreamState | null> {
  try {
    const { Item } = await ddbClient.get({
      TableName: BLOCKSTREAM_STATE_TABLE,
      Key: {
        network_id: NETWORK_ID
      },
      ConsistentRead: true
    }).promise();

    if (!Item || Item.network_id !== NETWORK_ID) {
      return null;
    }

    return Item as BlockStreamState;
  } catch (err) {
    logger.error({ err }, 'failed to fetch blockstream state');
    throw err;
  }
}

export async function saveBlockStreamState(prevState: BlockStreamState | null, nextState: BlockStreamState): Promise<void> {
  // build the input parameters
  let input: DocumentClient.PutItemInput = {
    TableName: BLOCKSTREAM_STATE_TABLE,
    Item: nextState
  };

  // add conditions to the expression if there's a previous state
  if (prevState !== null) {
    input = {
      ...input,
      ConditionExpression: '#network_id = :network_id AND #lastReconciledBlock.#hash = :hash AND #lastReconciledBlock.#number = :number',
      ExpressionAttributeNames: {
        '#network_id': 'network_id',
        '#lastReconciledBlock': 'lastReconciledBlock',
        '#hash': 'hash',
        '#number': 'number',
      },
      ExpressionAttributeValues: {
        ':network_id': prevState.network_id,
        ':hash': prevState.lastReconciledBlock.hash,
        ':number': prevState.lastReconciledBlock.number
      }
    };
  }

  try {
    logger.debug({ input }, 'saving blockstream state');

    await ddbClient.put(input).promise();
  } catch (err) {
    logger.error({ err, input }, 'failed to save blockstream state');
    throw err;
  }
}


async function compressBlock(block: BlockWithTransactionHashes, logs: Log[]): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    zlib.deflate(JSON.stringify({ block, logs }), (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer);
      }
    });
  });
}

export async function blockExists(hash: string, number: string): Promise<boolean> {
  const { Item } = await ddbClient.get({
    TableName: BLOCKS_TABLE,
    Key: {
      hash,
      number
    },
    AttributesToGet: ['hash', 'number']
  }).promise();

  return !!(Item && Item.hash === hash && Item.number === number);
}

export default async function saveBlockData(block: BlockWithTransactionHashes, logs: Log[], checkParentExists: boolean): Promise<void> {
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
      toHex(new BigNumber(block.number).minus(1).toNumber())
    );

    if (!parentExists) {
      logger.error({ metadata }, 'parent hash did not exist');
      throw new Error('parent block check failed');
    }
  }

  try {
    // when this data expires
    const ttl = getItemTtl();

    logger.debug({ metadata }, 'compressing block and logs');
    const payload = await compressBlock(block, logs);
    logger.info({ metadata, payloadSize: payload.length }, 'compressed payload length');

    // save the individual block
    const { ConsumedCapacity } = await ddbClient.put(
      {
        TableName: BLOCKS_TABLE,
        Item: {
          hash: block.hash,
          number: block.number,
          parentHash: block.parentHash,
          ttl,
          payload
        },
        ReturnConsumedCapacity: 'TOTAL',
        ConditionExpression: 'attribute_not_exists(#hash)',
        ExpressionAttributeNames: {
          '#hash': 'hash'
        }
      }
    ).promise();

    logger.info({ metadata, ConsumedCapacity }, 'completed block save operation');
  } catch (err) {
    logger.error({ err, metadata }, 'failed to save block');
    throw err;
  }

}
