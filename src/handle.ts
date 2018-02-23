import { DynamoDBStreamHandler } from 'aws-lambda';
import logger from './util/logger';
import { DynamoDB } from 'aws-sdk';
import { BlockWithTransactionHashes } from './util/model';
import { DESTINATION_QUEUE_NAME } from './util/env';

export const start: DynamoDBStreamHandler = (event, context, cb) => {
  // pull out the block keys
  const blocks: Pick<BlockWithTransactionHashes, 'hash' | 'number'>[] = event.Records.map(
    (record) =>
      record &&
      record.eventName === 'INSERT' &&
      record.dynamodb &&
      record.dynamodb.Keys ?
        DynamoDB.Converter.unmarshall(
          record.dynamodb.Keys
        ) : null
  ).filter(e => e !== null) as any;

  logger.info({ blocks, DESTINATION_QUEUE_NAME }, 'received notification of block insertions');
};
