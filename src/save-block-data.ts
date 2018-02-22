import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import { BlockWithTransactionHashes, Log, Transaction } from './model';
import logger from './logger';
import { BatchWriteItemRequestMap } from 'aws-sdk/clients/dynamodb';

const { BLOCKS_TABLE, TRANSACTIONS_TABLE, LOGS_TABLE } = process.env;

const documentClient = new DocumentClient();

export default async function saveBlockData(block: BlockWithTransactionHashes,
                                            transactions: Transaction[],
                                            logs: Log[]) {
  const metadata = {
    blockHash: block.hash,
    blockNumber: block.number,
    numTransactions: transactions.length,
    numLogs: logs.length
  };

  logger.info(metadata, 'beginning save operation');

  let putItems: BatchWriteItemRequestMap = {
    [BLOCKS_TABLE]: [
      {
        PutRequest: block
      }
    ],
    [TRANSACTIONS_TABLE]: transactions.map(
      transaction => ({
        PutRequest: transaction
      })
    ),
    [LOGS_TABLE]: logs.map(
      log => ({
        PutRequest: log
      })
    )
  };

  // while there are still unprocessed items
  while (_.any(putItems, (value) => value.length > 0)) {
    const RequestItems = _.omit(putItems, value => value.length === 0);

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