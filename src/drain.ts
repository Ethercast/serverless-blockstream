import { Handler } from 'aws-lambda';
import logger from './util/logger';
import { drainQueue, getQueueUrl, sqs } from './util/sqs/sqs-util';
import {
  Message, SendMessageBatchRequestEntryList
} from 'aws-sdk/clients/sqs';
import { BlockQueueMessage, Log } from './util/model';
import { getBlocksMatchingNumber } from './util/ddb/ddb-block-data';
import _ = require('underscore');
import { DESTINATION_LOG_QUEUE_NAME, DRAIN_QUEUE_LAMBDA_NAME, NETWORK_ID } from './util/env';

interface LogMessage {
  log: Log;
  removed: boolean;
}

async function flushMessagesToQueue(logMessages: LogMessage[]): Promise<void> {
  const QueueUrl = await getQueueUrl(DESTINATION_LOG_QUEUE_NAME);

  for (let i = 0; i < logMessages.length; i += 10) {
    const chunk = logMessages.slice(i, i + 10);

    const entries: SendMessageBatchRequestEntryList = chunk.map((logMessage) => ({
      Id: `${logMessage.log.blockHash}-${logMessage.log.transactionHash}-${logMessage.log.logIndex}`,
      MessageBody: JSON.stringify(logMessage),
      MessageDeduplicationId: `${logMessage.log.blockHash}-${logMessage.log.transactionHash}-${logMessage.log.logIndex}`,
      MessageGroupId: `net-${NETWORK_ID}`
    }));

    await sqs.sendMessageBatch({ QueueUrl, Entries: entries }).promise();
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
  const logMessages = _.chain(removed)
    .map(({ logs }) => logs)
    .flatten(true)
    .map(log => ({ log, removed: true }))
    .concat(
      _.map(
        added.logs,
        log => ({ log, removed: false })
      )
    )
    .value();

  await flushMessagesToQueue(logMessages);

  logger.info({});
}

export const start: Handler = async (event, context, callback) => {
  let QueueUrl: string;
  try {
    QueueUrl = await getQueueUrl(DRAIN_QUEUE_LAMBDA_NAME);
  } catch (err) {
    logger.error({ err }, 'failed to get queue url');
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