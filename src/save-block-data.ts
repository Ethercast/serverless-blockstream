import { DynamoDB } from 'aws-sdk';
import { BlockWithFullTransactions, Log } from './model';
import logger from './logger';
import * as _ from 'underscore';

const { BLOCKS_TABLE, LOGS_TABLE } = process.env;

const documentClient = new DynamoDB.DocumentClient();

const MAX_ITEMS_PER_PUT = 25;

export default async function saveBlockData(block: BlockWithFullTransactions, logs: Log[]) {
  if (!BLOCKS_TABLE || !LOGS_TABLE) {
    throw new Error('missing table environment variables');
  }

  const metadata = {
    blockHash: block.hash,
    blockNumber: block.number
  };

  logger.info(metadata, 'beginning save operation');

  try {
    // put all the logs in for the block
    await chunkedPut(metadata, LOGS_TABLE, logs);

    const { ConsumedCapacity } = await documentClient.put({
      TableName: BLOCKS_TABLE,
      Item: block,
      ReturnConsumedCapacity: 'TOTAL',
      ConditionExpression: 'attribute_not_exists(#hash)',
      ExpressionAttributeNames: {
        '#hash': 'hash'
      }
    }).promise();

    logger.info({ metadata, ConsumedCapacity }, 'completed save operation');
  } catch (err) {
    logger.error({ err, metadata }, 'failed to save block');
    throw err;
  }
}


async function chunkedPut(metadata: { blockHash: string; blockNumber: string },
                          tableName: string,
                          items: any[]) {

  const numPuts = Math.max(1, Math.ceil(items.length / MAX_ITEMS_PER_PUT));
  const chunkSize = Math.ceil(items.length / numPuts);

  for (let putIx = 0; putIx < numPuts; putIx++) {
    logger.debug({ metadata, tableName, putIx });
    const start = putIx * chunkSize;
    const end = start + chunkSize;

    await putAll(metadata, tableName, items.slice(start, end));
  }
}

async function putAll(metadata: { blockHash: string; blockNumber: string; },
                      tableName: string,
                      items: any[]) {
  logger.info(metadata, 'beginning save operation');

  let putItems: DynamoDB.DocumentClient.BatchWriteItemRequestMap | undefined = {
    [tableName]: items.map(
      (Item: any) => ({
        PutRequest: { Item }
      })
    )
  };

  // while there are still unprocessed items
  while (putItems && _.any(putItems, (value) => value.length > 0)) {
    const RequestItems: any = _.omit(putItems, (value: DynamoDB.DocumentClient.WriteRequests) => value.length === 0);

    logger.debug({ metadata }, 'processing items');

    // process them
    const { UnprocessedItems, ConsumedCapacity } = await documentClient.batchWrite({
      RequestItems
    }).promise();

    putItems = UnprocessedItems;

    logger.debug({ metadata, ConsumedCapacity }, 'Consumed capacity');
  }

  logger.info(metadata, 'completed put items');
}
