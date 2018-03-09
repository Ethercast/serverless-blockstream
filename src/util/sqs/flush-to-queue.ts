import getQueueUrl from './get-queue-url';
import * as SQS from 'aws-sdk/clients/sqs';
import { SendMessageBatchRequestEntryList } from 'aws-sdk/clients/sqs';
import { NETWORK_ID } from '../env';
import logger from '../logger';

export default async function flushMessagesToQueue<T>(sqs: SQS, queueName: string, messages: T[], getMessageId: (item: T) => string): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  const QueueUrl = await getQueueUrl(sqs, queueName);

  for (let i = 0; i < messages.length; i += 10) {
    const chunk = messages.slice(i, i + 10);

    const entries: SendMessageBatchRequestEntryList = chunk.map((message) => {
      const Id: string = getMessageId(message);

      return {
        Id,
        MessageBody: JSON.stringify(message),
        MessageDeduplicationId: Id,
        MessageGroupId: `net-${NETWORK_ID}`
      };
    });

    const { Successful, Failed } = await sqs.sendMessageBatch({ QueueUrl, Entries: entries }).promise();

    if (Failed.length > 0) {
      logger.warn({ Failed }, 'some messages failed to send');
      throw new Error('some messages failed to send to the downstream queue');
    } else {
      logger.debug({ count: Successful.length }, 'successfully flushed chunk to queue');
    }
  }
}
