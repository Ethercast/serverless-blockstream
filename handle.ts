import { DynamoDBStreamHandler } from 'aws-lambda';
import logger from './src/logger';
import { DynamoDB } from 'aws-sdk';

export const start: DynamoDBStreamHandler = (event, context, cb) => {
  const blocks = event.Records.map(
    ({ dynamodb: { NewImage } }) => DynamoDB.Converter.marshall(NewImage)
  );

  logger.info({ blocks }, 'handling blocks');
};
