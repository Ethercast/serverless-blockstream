import { DynamoDB } from 'aws-sdk';
import { BlockWithTransactionHashes, Log, Transaction } from './model';
import logger from './logger';
import * as _ from 'underscore';

const { BLOCKS_TABLE, TRANSACTIONS_TABLE, LOGS_TABLE } = process.env;

const documentClient = new DynamoDB.DocumentClient();

const MAX_ITEMS_PER_PUT = 25;

export default async function saveBlockData(block: BlockWithTransactionHashes,
                                            transactions: Transaction[],
                                            logs: Log[]) {
  if (!BLOCKS_TABLE || !TRANSACTIONS_TABLE || !LOGS_TABLE) {
    throw new Error('missing table environment variables');
  }

  const metadata = {
    blockHash: block.hash,
    blockNumber: block.number
  };

  const max = Math.max(transactions.length, logs.length);
  const numPuts = Math.max(1, Math.ceil(max / MAX_ITEMS_PER_PUT));

  const txChunks = _.chunk(transactions, numPuts) as Transaction[][];
  const logChunks = _.chunk(logs, numPuts) as Log[][];

  for (let i = 0; i < numPuts; i++) {
    logger.debug({ metadata, putIx: i }, 'putting chunk');
    await putAll(metadata, block, txChunks[i], logChunks[i]);
  }

  logger.info(metadata, 'completed save operation');
}


async function putAll(metadata: { blockHash: string; blockNumber: string; },
                      block: BlockWithTransactionHashes,
                      transactions: Transaction[],
                      logs: Log[]) {
  logger.info(metadata, 'beginning save operation');

  let putItems: DynamoDB.DocumentClient.BatchWriteItemRequestMap | undefined = {
    [BLOCKS_TABLE]: [
      {
        PutRequest: { Item: block }
      }
    ],
    [TRANSACTIONS_TABLE]: transactions.map(
      transaction => ({
        PutRequest: { Item: transaction }
      })
    ),
    [LOGS_TABLE]: logs.map(
      log => ({
        PutRequest: { Item: log }
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