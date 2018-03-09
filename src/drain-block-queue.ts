import 'source-map-support/register';
import { Handler } from 'aws-lambda';
import logger from './util/logger';
import { NEW_BLOCK_QUEUE_NAME } from './util/env';
import processQueueMessage from './util/process-queue-message';
import getQueueUrl from './util/sqs/get-queue-url';
import QueueDrainer from '@ethercast/queue-drainer';
import * as SQS from 'aws-sdk/clients/sqs';

const sqs = new SQS();

export const start: Handler = async (event, context) => {
  let QueueUrl: string;
  try {
    QueueUrl = await getQueueUrl(sqs, NEW_BLOCK_QUEUE_NAME);
  } catch (err) {
    logger.fatal({ err, QueueName: NEW_BLOCK_QUEUE_NAME }, 'failed to get queue url');
    context.done(err);
    return;
  }

  try {
    const drainer = new QueueDrainer({
      sqs,
      queueUrl: QueueUrl,
      handleMessage: processQueueMessage.bind(null, sqs),
      logger,
      shouldContinue: () => context.getRemainingTimeInMillis() > 3000
    });

    await drainer.drain();
  } catch (err) {
    logger.fatal({ err }, 'error while draining the queue');
    context.done(err);
    return;
  }

  context.done();
};