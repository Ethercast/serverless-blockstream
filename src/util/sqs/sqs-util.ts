import { SQS } from 'aws-sdk';
import { MessageList, Message } from 'aws-sdk/clients/sqs';
import logger from '../logger';

export const sqs = new SQS();

const QUEUE_URL_CACHE: { [queueName: string]: Promise<string> } = {};

export const getQueueUrl: (QueueName: string) => Promise<string> =
  async function (QueueName: string) {
    if (QUEUE_URL_CACHE[QueueName]) {
      return QUEUE_URL_CACHE[QueueName];
    }

    return (
      QUEUE_URL_CACHE[QueueName] =
        sqs.getQueueUrl({ QueueName }).promise()
          .then(
            ({ QueueUrl }) => {
              if (!QueueUrl) {
                throw new Error('could not find queue url: ' + QueueName);
              }

              return QueueUrl;
            }
          )
          .catch(
            err => {
              logger.error({ err, QueueName }, 'failed to get queue');
              throw err;
            }
          )
    );
  };

// Helper function to drain a queue
export async function drainQueue(QueueUrl: string,
                                 handleMessage: (message: Message) => Promise<void>,
                                 shouldContinue: () => boolean,
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
        logger.fatal({ Message: Messages[i] }, 'no receipt handle on receive!');
        throw new Error('no receipt handle');
      }

      try {
        await handleMessage(Messages[i]);

        await sqs.deleteMessage({
          QueueUrl,
          ReceiptHandle
        }).promise();

        logger.info({ MessageId: Messages[i].MessageId }, 'drainQueue: processed queue message');
      } catch (err) {
        logger.fatal({ err, Message: Messages[i] }, 'drainQueue: failed to process a queue message');
        throw err;
      }

      if (!shouldContinue()) {
        logger.info('drainQueue: not fetching next block since shouldContinue returned false');
        break;
      }
    }
  }
}