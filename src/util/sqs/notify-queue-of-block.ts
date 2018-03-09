import { BlockWithTransactionHashes } from '@ethercast/model';
import { NETWORK_ID, NEW_BLOCK_QUEUE_NAME } from '../env';
import logger from '../logger';
import { BlockQueueMessage } from '../model';
import getQueueUrl from './get-queue-url';
import * as SQS from 'aws-sdk/clients/sqs';

export default async function notifyQueueOfBlock(sqs: SQS, metadata: Pick<BlockWithTransactionHashes, 'hash' | 'number'>, removed: boolean): Promise<string> {
  let QueueUrl: string;
  try {
    QueueUrl = await getQueueUrl(sqs, NEW_BLOCK_QUEUE_NAME);
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

    if (typeof MessageId !== 'string') {
      throw new Error('message id not received after placing message in queue');
    }

    logger.info({ queueMessage, MessageId }, 'placed message in queue');

    return MessageId;
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