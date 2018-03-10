import getQueueUrl from './get-queue-url';
import * as SQS from 'aws-sdk/clients/sqs';
import { SendMessageBatchRequestEntry, SendMessageBatchRequestEntryList } from 'aws-sdk/clients/sqs';
import { NETWORK_ID } from '../env';
import * as zlib from 'zlib';
import * as Logger from 'bunyan';

export default async function flushMessagesToQueue<T>(sqs: SQS, logger: Logger, queueName: string, messages: T[], getMessageId: (item: T) => string): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  const QueueUrl = await getQueueUrl(sqs, queueName);

  const flushLogger = logger.child({ queueInfo: { name: queueName, url: QueueUrl } });

  for (let start = 0; start < messages.length; start += 10) {
    const chunk = messages.slice(start, start + 10);

    const entryList: SendMessageBatchRequestEntryList =
      await Promise.all(
        chunk.map(
          message => {
            return new Promise<SendMessageBatchRequestEntry>((resolve, reject) => {
              const Id: string = getMessageId(message);
              const MessageBody = JSON.stringify(message);

              // we have to do this because some logs are really big... :(
              zlib.deflate(MessageBody, (err, buffer) => {
                if (err) {
                  reject(err);
                } else {
                  resolve({
                    Id,
                    MessageBody: buffer.toString('base64'),
                    MessageDeduplicationId: Id,
                    MessageGroupId: `net-${NETWORK_ID}`
                  });
                }
              });
            });
          }
        )
      );

    const params: SQS.Types.SendMessageBatchRequest = { QueueUrl, Entries: entryList };

    const { Successful, Failed } = await sqs.sendMessageBatch(params).promise();

    if (Failed.length > 0) {
      flushLogger.fatal({ Failed }, 'some messages failed to send');
      throw new Error('some messages failed to flush to the queue');
    } else {
      flushLogger.debug({ count: Successful.length }, 'successfully flushed chunk to queue');
    }
  }

  flushLogger.debug({ count: messages.length }, 'flushed messages to queue');
}
