import 'source-map-support/register';
import logger from './logger';
import { getQueueUrl, sqs } from './sqs/sqs-util';
import { Message, SendMessageBatchRequestEntryList } from 'aws-sdk/clients/sqs';
import { BlockQueueMessage } from './model';
import { getBlocksMatchingNumber } from './ddb/block-data';
import _ = require('underscore');
import { LOG_FIREHOSE_QUEUE_NAME, NETWORK_ID } from './env';
import * as crypto from 'crypto';
import { mustBeValidLog } from './joi-schema';
import { Log } from '../client/model';

async function flushMessagesToQueue(validatedLogs: Log[]): Promise<void> {
  if (validatedLogs.length === 0) {
    return;
  }

  let QueueUrl: string;
  try {
    QueueUrl = await getQueueUrl(LOG_FIREHOSE_QUEUE_NAME);
  } catch (err) {
    logger.error({ err }, `failed to get queue url: ${LOG_FIREHOSE_QUEUE_NAME}`);
    throw err;
  }

  for (let i = 0; i < validatedLogs.length; i += 10) {
    const chunk = validatedLogs.slice(i, i + 10);

    const entries: SendMessageBatchRequestEntryList = chunk.map((log) => {
      const Id: string = crypto.createHash('sha256')
        .update(log.blockHash)
        .update(log.transactionHash)
        .update(log.logIndex)
        .digest('hex');

      return {
        Id,
        MessageBody: JSON.stringify(log),
        MessageDeduplicationId: Id,
        MessageGroupId: `net-${NETWORK_ID}`
      };
    });

    const { Successful, Failed } = await sqs.sendMessageBatch({ QueueUrl, Entries: entries }).promise();

    if (Failed.length > 0) {
      logger.warn({ Failed }, 'some messages failed to send');
      throw new Error('some messages failed to send to the downstream queue');
    } else {
      logger.info({ count: Successful.length }, 'successfully flushed chunk to queue');
    }
  }
}

export default async function processQueueMessage({ Body, MessageId, ReceiptHandle }: Message) {
  if (!ReceiptHandle || !Body) {
    logger.error({ MessageId, ReceiptHandle, Body }, 'message received with no body/receipt handle');
    throw new Error('No receipt handle/body!');
  }

  logger.debug({ MessageId, Body }, 'processing message');

  const { hash, number, removed } = JSON.parse(Body) as BlockQueueMessage;

  logger.info({ hash, number }, 'processing block');

  // first get all the blocks that have this number
  const matchingBlocks = await getBlocksMatchingNumber(number);
  if (matchingBlocks.length === 0) {
    throw new Error('no blocks matching the number in the queue message');
  }

  const removedBlocks = _.filter(matchingBlocks, p => p.block.hash !== hash);
  const addedBlock = _.find(matchingBlocks, p => p.block.hash === hash);

  if (!addedBlock) {
    throw new Error(`block not found with hash ${hash} and number ${hash}`);
  }

  logger.info({
    removed: removedBlocks.map(({ block: { hash, number }, logs }) => ({ hash, number, logCount: logs.length })),
    added: { hash: addedBlock.block.hash, number: addedBlock.block.number, logCount: addedBlock.logs.length }
  }, 'processing block changes');

  // first send messages for all the logs that were in the blocks that are now overwritten
  const validatedLogs: Log[] = _.chain(removedBlocks)
    .map(({ logs }) => logs)
    .flatten(true)
    .map(log => ({ ...log, removed: true }))
    .concat(
      _.map(
        addedBlock.logs,
        log => ({ ...log, removed: false })
      )
    )
    .map(mustBeValidLog)
    .value();

  await flushMessagesToQueue(validatedLogs);

  logger.info({ count: validatedLogs.length }, 'flushed messages to queue');
}