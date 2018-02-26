import { SQS } from 'aws-sdk';
import { MessageList, Message } from 'aws-sdk/clients/sqs';
import logger from '../logger';
import { BlockWithTransactionHashes } from '../../client/model';
import { NETWORK_ID, NEW_BLOCK_QUEUE_NAME } from '../env';
import { BlockQueueMessage } from '../model';

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

export async function notifyQueueOfBlock(metadata: Pick<BlockWithTransactionHashes, 'hash' | 'number'>, removed: boolean) {
  let QueueUrl: string;
  try {
    QueueUrl = await getQueueUrl(NEW_BLOCK_QUEUE_NAME);
  } catch (err) {
    logger.error({ err, metadata, removed }, 'could not find queue url: ' + NEW_BLOCK_QUEUE_NAME);
    throw err;
  }

  try {
    const queueMessage: BlockQueueMessage = { hash: metadata.hash, number: metadata.number, removed };

    const { MessageId } = await sqs.sendMessage({
      QueueUrl,
      MessageGroupId: `net-${NETWORK_ID}`,
      MessageDeduplicationId: `${metadata.hash}-${metadata.number}-${removed}`,
      MessageBody: JSON.stringify(queueMessage)
    }).promise();

    logger.info({ queueMessage, MessageId }, 'placed message in queue');
  } catch (err) {
    logger.error({
      QueueName: NEW_BLOCK_QUEUE_NAME,
      err,
      metadata,
      removed
    }, 'failed to deliver block notification message to queue');
    throw err;
  }
}