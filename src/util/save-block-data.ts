import { BlockStreamState, BlockWithTransactionHashes, Log } from './model';
import logger from './logger';
import timedAction from './time-action';
import { BLOCK_DATA_TTL_MS, BLOCKS_TABLE, BLOCKSTREAM_STATE_TABLE, LOGS_TABLE, NETWORK_ID } from './env';
import { chunkedPut, ddbClient } from './ddb-util';

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

export default async function saveBlockData(block: BlockWithTransactionHashes, logs: Log[]) {
  const metadata = {
    blockHash: block.hash,
    blockNumber: block.number,
    txCount: block.transactions.length
  };

  await timedAction('save block data', async () => {
    try {
      // when this data expires
      const ttl = getItemTtl();

      try {
        // put all the logs in for the block first
        await chunkedPut(metadata, LOGS_TABLE, logs.map(log => ({ ...log, ttl })));
      } catch (err) {
        logger.error({ err, metadata }, 'failed to save logs');
        throw err;
      }

      try {
        // save the individual block
        const { ConsumedCapacity } = await ddbClient.put(
          {
            TableName: BLOCKS_TABLE,
            Item: { ...block, ttl },
            ReturnConsumedCapacity: 'TOTAL',
            ConditionExpression: 'attribute_not_exists(#hash)',
            ExpressionAttributeNames: {
              '#hash': 'hash'
            }
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
  });
}
