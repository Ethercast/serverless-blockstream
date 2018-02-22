import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { BlockWithTransactionHashes, Log, Transaction } from './model';
import logger from './logger';
import * as _ from 'underscore';
import BatchWriteItemRequestMap = DocumentClient.BatchWriteItemRequestMap;
import WriteRequests = DocumentClient.WriteRequests;

const { BLOCKS_TABLE, TRANSACTIONS_TABLE, LOGS_TABLE } = process.env;

const documentClient = new DocumentClient();

export default async function saveBlockData(block: BlockWithTransactionHashes,
                                            transactions: Transaction[],
                                            logs: Log[]) {
  if (!BLOCKS_TABLE || !TRANSACTIONS_TABLE || !LOGS_TABLE) {
    throw new Error('missing table environment variables');
  }

  const metadata = {
    blockHash: block.hash,
    blockNumber: block.number,
    numTransactions: transactions.length,
    numLogs: logs.length
  };

  logger.info(metadata, 'beginning save operation');

  let putItems: BatchWriteItemRequestMap | undefined = {
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
    const RequestItems: any = _.omit(putItems, (value: WriteRequests) => value.length === 0);

    logger.debug({ metadata, RequestItems }, 'processing items');

    // process them
    const { UnprocessedItems, ConsumedCapacity } = await documentClient.batchWrite({
      RequestItems
    }).promise();

    putItems = UnprocessedItems;

    logger.debug({ metadata, ConsumedCapacity }, 'Consumed capacity');
  }

  logger.info(metadata, 'completed save operation');
}