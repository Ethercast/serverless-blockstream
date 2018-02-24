import { SQS } from 'aws-sdk';
import { SQS_BLOCK_RECEIVED_QUEUE_NAME } from '../env';
import * as _ from 'underscore';
import { MessageList, Message } from 'aws-sdk/clients/sqs';
import logger from '../logger';

export const sqs = new SQS();

const QUEUE_URL_CACHE: { [queueName: string]: Promise<string> } = {};

export const getQueueUrl: (QueueName: string) => Promise<string> = async function (QueueName: string) {
  if (QUEUE_URL_CACHE[QueueName]) {
    return QUEUE_URL_CACHE[QueueName];
  }

  return (
    QUEUE_URL_CACHE[QueueName] = sqs.getQueueUrl({ QueueName }).promise()
      .then(
        ({ QueueUrl }) => {
          if (!QueueUrl) {
            throw new Error('could not find queue url: ' + SQS_BLOCK_RECEIVED_QUEUE_NAME);

          }
          return QueueUrl;
        }
      )
  );
};

// Helper function to drain a queue
export async function drainQueue(QueueUrl: string,
                                 handleMessage: (message: Message) => Promise<void>,
                                 MaxNumberOfMessages: number = 10,
                                 WaitTimeSeconds: number = 0) {
  let Messages: MessageList | undefined;

  // while we can fetch messages
  while (
    Messages =
      (await sqs.receiveMessage({
        QueueUrl,
        MaxNumberOfMessages,
        WaitTimeSeconds
      }).promise())
        .Messages
    ) {
    logger.info({ QueueUrl, count: Messages.length }, 'fetched messages');

    if (Messages.length === 0) {
      logger.info('no messages, exiting');
      return;
    }

    for (let i = 0; i < Messages.length; i++) {
      const { ReceiptHandle } = Messages[i];

      if (!ReceiptHandle) {
        logger.error({ Message: Messages[i] }, 'no receipt handle on receive!');
        throw new Error('no receipt handle');
      }

      try {
        await handleMessage(Messages[i]);

        await sqs.deleteMessage({
          QueueUrl,
          ReceiptHandle
        }).promise();

        logger.info({ MessageId: Messages[i].MessageId }, 'processed queue message');
      } catch (err) {
        logger.error({ err, Message: Messages[i] }, 'drainQueue: failed to process a queue message');
        throw err;
      }
    }
  }
}