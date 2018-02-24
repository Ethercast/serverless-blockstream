import 'source-map-support/register';
import { Handler } from 'aws-lambda';
import logger from './util/logger';
import { drainQueue, getQueueUrl, sqs } from './util/sqs/sqs-util';
import {
  Message, SendMessageBatchRequestEntryList
} from 'aws-sdk/clients/sqs';
import { BlockQueueMessage, Log } from './util/model';
import { getBlocksMatchingNumber } from './util/ddb/ddb-block-data';
import _ = require('underscore');
import {
  DESTINATION_LOG_QUEUE_NAME, NETWORK_ID,
  SQS_BLOCK_RECEIVED_QUEUE_NAME
} from './util/env';
import * as crypto from 'crypto';

async function flushMessagesToQueue(logs: Log[]): Promise<void> {
  if (logs.length === 0) {
    return;
  }

  let QueueUrl: string;
  try {
    QueueUrl = await getQueueUrl(DESTINATION_LOG_QUEUE_NAME);
  } catch (err) {
    logger.error({ err }, `failed to get queue url: ${DESTINATION_LOG_QUEUE_NAME}`);
    throw err;
  }

  for (let i = 0; i < logs.length; i += 10) {
    const chunk = logs.slice(i, i + 10);


    const entries: SendMessageBatchRequestEntryList = chunk.map((log) => {
      const Id: string = crypto.createHash('sha256')
        .update(log.blockHash)
        .update(log.transactionHash)
        .update(log.logIndex)
        .digest('hex');

      return {
        Id,
        MessageBody: JSON.stringify(log)
      };
    });

    const { Successful, Failed } = await sqs.sendMessageBatch({ QueueUrl, Entries: entries }).promise();

    if (Failed.length > 0) {
      logger.warn({ Failed }, 'some messages failed to send');
      throw new Error('some messages failed to send to the downstream queue');
    } else {
      logger.info('successfully flushed chunk to queue');
    }
  }
}

async function processQueueMessage({ Body, MessageId, ReceiptHandle }: Message) {
  if (!ReceiptHandle || !Body) {
    logger.error({ MessageId, ReceiptHandle, Body }, 'message received with no body/receipt handle');
    throw new Error('No receipt handle/body!');
  }

  logger.debug({ MessageId, Body }, 'processing message');

  const { hash, number } = JSON.parse(Body) as BlockQueueMessage;

  logger.info({ hash, number }, 'processing block');

  // first get all the blocks that have this number
  const matchingBlocks = await getBlocksMatchingNumber(number);
  if (matchingBlocks.length === 0) {
    throw new Error('no blocks matching the number in the queue message');
  }

  const removed = _.filter(matchingBlocks, p => p.block.hash !== hash);
  const added = _.find(matchingBlocks, p => p.block.hash === hash);

  if (!added) {
    throw new Error(`block not found with hash ${hash} and number ${hash}`);
  }

  logger.info({
    removed: removed.map(({ block: { hash, number }, logs }) => ({ hash, number, logCount: logs.length })),
    added: { hash: added.block.hash, number: added.block.number, logCount: added.logs.length }
  }, 'processing block changes');

  // first send messages for all the logs that were in the blocks that are now overwritten
  const logs: Log[] = _.chain(removed)
    .map(({ logs }) => logs)
    .flatten(true)
    .map(log => ({ ...log, removed: true }))
    .concat(
      _.map(
        added.logs,
        log => ({ ...log, removed: false })
      )
    )
    .value();

  await flushMessagesToQueue(logs);

  logger.info({ count: logs.length }, 'flushed messages to queue');
}

export const start: Handler = async (event, context, callback) => {
  let QueueUrl: string;
  try {
    QueueUrl = await getQueueUrl(SQS_BLOCK_RECEIVED_QUEUE_NAME);
  } catch (err) {
    logger.error({ err, QueueName: SQS_BLOCK_RECEIVED_QUEUE_NAME }, 'failed to get queue url');
    context.done(err);
    return;
  }

  try {
    await drainQueue(QueueUrl, processQueueMessage, context);
  } catch (err) {
    logger.error({ err }, 'error while draining the queue');
    context.done(err);
  }

  context.done();
};