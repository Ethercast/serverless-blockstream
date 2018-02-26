import 'source-map-support/register';
import { Handler } from 'aws-lambda';
import logger from './util/logger';
import { drainQueue, getQueueUrl } from './util/sqs/sqs-util';
import { NEW_BLOCK_QUEUE_NAME } from './util/env';
import processQueueMessage from './util/process-queue-message';

export const start: Handler = async (event, context, callback) => {
  let QueueUrl: string;
  try {
    QueueUrl = await getQueueUrl(NEW_BLOCK_QUEUE_NAME);
  } catch (err) {
    logger.fatal({ err, QueueName: NEW_BLOCK_QUEUE_NAME }, 'failed to get queue url');
    context.done(err);
    return;
  }

  try {
    // whether we should continue draining the queue
    const shouldContinue = () => context.getRemainingTimeInMillis() > 3000;

    await drainQueue(QueueUrl, processQueueMessage, shouldContinue);
  } catch (err) {
    logger.fatal({ err }, 'error while draining the queue');
    context.done(err);
    return;
  }

  context.done();
};