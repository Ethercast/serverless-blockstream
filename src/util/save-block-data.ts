import { BlockStreamState, BlockWithTransactionHashes, Log } from './model';
import logger from './logger';
import { BLOCK_DATA_TTL_MS, BLOCKS_TABLE, BLOCKSTREAM_STATE_TABLE, NETWORK_ID } from './env';
import { ddbClient } from './ddb-util';
import * as zlib from 'zlib';

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

export async function saveBlockStreamState(state: BlockStreamState): Promise<void> {
  try {
    await ddbClient.put({
      TableName: BLOCKSTREAM_STATE_TABLE,
      Item: state
    }).promise();
  } catch (err) {
    logger.error({ err }, 'failed to save blockstream state');
    throw err;
  }
}


export async function compressBlock(block: BlockWithTransactionHashes, logs: Log[]): Promise<Buffer> {
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

export default async function saveBlockData(block: BlockWithTransactionHashes, logs: Log[]) {
  const metadata = {
    blockHash: block.hash,
    blockNumber: block.number,
    txCount: block.transactions.length,
    logCount: logs.length
  };

  try {
    // when this data expires
    const ttl = getItemTtl();

    try {
      const payload = await compressBlock(block, logs);
      logger.info({ metadata, payloadSize: payload.length }, 'compressed payload length');

      // save the individual block
      const { ConsumedCapacity } = await ddbClient.put(
        {
          TableName: BLOCKS_TABLE,
          Item: { hash: block.hash, number: block.number, ttl, payload },
          ReturnConsumedCapacity: 'TOTAL'
        }
      ).promise();

      logger.info({ metadata, ConsumedCapacity }, 'completed block save operation');
    } catch (err) {
      logger.error({ err, block, metadata }, 'failed to save block');
      throw err;
    }

  } catch (err) {
    logger.error({ err, metadata }, 'error while saving block data');
    throw err;
  }
}
