import { DynamoDBStreamHandler } from 'aws-lambda';
import logger from './src/logger';
import { DynamoDB } from 'aws-sdk';

export const start: DynamoDBStreamHandler = (event, context, cb) => {
  const blocks = event.Records.map(
    (record) => record && record.dynamodb && record.dynamodb.NewImage ?
      DynamoDB.Converter.marshall(
        record.dynamodb.NewImage
      ) : null
  ).filter(e => e !== null);

  logger.info({ blocks }, 'handling blocks');
};
