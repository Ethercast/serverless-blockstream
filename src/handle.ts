import { DynamoDBStreamHandler } from 'aws-lambda';
import logger from './util/logger';
import { DynamoDB, SQS } from 'aws-sdk';
import { BlockWithTransactionHashes } from './util/model';
import { SQS_BLOCK_RECEIVED_QUEUE_URL } from './util/env';

type BlockKey = Pick<BlockWithTransactionHashes, 'hash' | 'number'>

const sqs = new SQS();

export const start: DynamoDBStreamHandler = async (event, context, cb) => {
  // pull out the block keys
  const blocks: BlockKey[] = event.Records.map(
    (record) =>
      record &&
      record.eventName === 'INSERT' &&
      record.dynamodb &&
      record.dynamodb.Keys ?
        DynamoDB.Converter.unmarshall(
          record.dynamodb.Keys
        ) : null
  ).filter(e => e !== null) as any;

  logger.info({ blocks, destinationQueue: SQS_BLOCK_RECEIVED_QUEUE_URL }, 'received notification of block insertion');

  for (let i = 0; i < blocks.length; i++) {
    try {
      await handleBlock(blocks[i]);
    } catch (err) {
      logger.error({ err }, 'failed to handle block');
      context.done(err);
    }
  }
};

async function handleBlock(block: BlockKey): Promise<void> {
  logger.info({ block }, 'enqueuing block');
  await sqs.sendMessage({
    MessageBody: JSON.stringify(block),
    MessageDeduplicationId: block.hash,
    MessageGroupId: '1',
    QueueUrl: SQS_BLOCK_RECEIVED_QUEUE_URL
  }).promise();
}