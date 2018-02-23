import * as _ from 'underscore';
import logger from './logger';
import { DynamoDB } from 'aws-sdk';

const MAX_ITEMS_PER_PUT = 25;

export const ddbClient = new DynamoDB.DocumentClient();

export async function chunkedPut(metadata: { blockHash: string; blockNumber: string },
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
    const { UnprocessedItems, ConsumedCapacity } = await ddbClient.batchWrite({ RequestItems }).promise();

    putItems = UnprocessedItems;

    logger.debug({ metadata, ConsumedCapacity }, 'Consumed capacity');
  }

  logger.info(metadata, 'completed put items');
}
