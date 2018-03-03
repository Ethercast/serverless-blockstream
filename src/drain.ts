import 'source-map-support/register';
import { Handler } from 'aws-lambda';
import logger from './util/logger';
import { NEW_BLOCK_QUEUE_NAME } from './util/env';
import processQueueMessage from './util/process-queue-message';
import getQueueUrl, { sqs } from './util/sqs/get-queue-url';
import QueueDrainer from '@ethercast/queue-drainer';

export const start: Handler = async (event, context) => {
  let QueueUrl: string;
  try {
    QueueUrl = await getQueueUrl(NEW_BLOCK_QUEUE_NAME);
  } catch (err) {
    logger.fatal({ err, QueueName: NEW_BLOCK_QUEUE_NAME }, 'failed to get queue url');
    context.done(err);
    return;
  }

  try {
    const drainer = new QueueDrainer({
      sqs,
      queueUrl: QueueUrl,
      handleMessage: processQueueMessage,
      logger,
      getRemainingTime: () => context.getRemainingTimeInMillis()
    });

    await drainer.drain();
  } catch (err) {
    logger.fatal({ err }, 'error while draining the queue');
    context.done(err);
    return;
  }

  context.done();
};