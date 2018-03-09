import getQueueUrl from './get-queue-url';
import * as SQS from 'aws-sdk/clients/sqs';
import { SendMessageBatchRequestEntryList } from 'aws-sdk/clients/sqs';
import { NETWORK_ID } from '../env';
import logger from '../logger';

const MAX_SQS_BATCH_SIZE = 262144;
const MAX_SQS_BATCH_COUNT = 10;

export default async function flushMessagesToQueue<T>(sqs: SQS, queueName: string, messages: T[], getMessageId: (item: T) => string): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  const QueueUrl = await getQueueUrl(sqs, queueName);

  // copy the message array
  let pending = messages.slice();

  // while we still have pending messages...
  while (pending.length > 0) {
    const entryChunk: SendMessageBatchRequestEntryList = [];

    let chunkSize = 0;
    let itemCount = 0;

    while (itemCount < MAX_SQS_BATCH_COUNT && itemCount < pending.length) {
      const message = pending[itemCount];

      const Id: string = getMessageId(message);

      const MessageBody = JSON.stringify(message);

      // do not add if it exceeds the max chunk size, with a buffer of roughly 20kb
      if (chunkSize + MessageBody.length > MAX_SQS_BATCH_SIZE - 20000) {
        break;
      }

      itemCount++;
      chunkSize += MessageBody.length;

      entryChunk.push({
        Id,
        MessageBody,
        MessageDeduplicationId: Id,
        MessageGroupId: `net-${NETWORK_ID}`
      });
    }

    pending = pending.slice(itemCount);

    const { Successful, Failed } = await sqs.sendMessageBatch({ QueueUrl, Entries: entryChunk }).promise();

    if (Failed.length > 0) {
      logger.fatal({ QueueUrl, Failed }, 'some messages failed to send');
      throw new Error('some messages failed to flush to the queue');
    } else {
      logger.debug({ QueueUrl, count: Successful.length }, 'successfully flushed chunk to queue');
    }
  }

  logger.info({ queueName, count: messages.length }, 'flushed messages to queue');
}
