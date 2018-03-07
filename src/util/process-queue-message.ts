import logger from './logger';
import { Message, SendMessageBatchRequestEntryList } from 'aws-sdk/clients/sqs';
import { BlockQueueMessage } from './model';
import { getBlock } from './ddb/block-data';
import { LOG_FIREHOSE_QUEUE_NAME, NETWORK_ID } from './env';
import * as crypto from 'crypto';
import { Log, mustBeValidLog } from '@ethercast/model';
import BigNumber from 'bignumber.js';
import decodeLog from './abi/decode-log';
import getQueueUrl, { sqs } from './sqs/get-queue-url';
import _ = require('underscore');

async function flushLogMessagesToQueue(validatedLogs: Log[]): Promise<void> {
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
      logger.debug({ count: Successful.length }, 'successfully flushed chunk to queue');
    }
  }
}

export default async function processQueueMessage({ Body, MessageId, ReceiptHandle }: Message): Promise<void> {
  if (!ReceiptHandle || !Body) {
    logger.error({ MessageId, ReceiptHandle, Body }, 'message received with no body/receipt handle');
    throw new Error('No receipt handle/body!');
  }

  logger.debug({ MessageId, Body }, 'processing message');

  const message = JSON.parse(Body) as BlockQueueMessage;
  const { hash, number, removed } = message;

  logger.info({ MessageId, message }, 'processing message');

  // first get all the blocks that have this number
  const blockPayload = await getBlock(hash, number);

  if (!blockPayload) {
    throw new Error(`block not found with hash ${hash} and number ${hash}`);
  }

  logger.info({
    message,
    transactionCount: blockPayload.block.transactions.length,
    receiptCount: blockPayload.receipts.length
  }, 'received block');

  // first send messages for all the logs that were in the blocks that are now overwritten
  const validatedLogs: Log[] = _.chain(blockPayload.receipts)
    .map(receipt => receipt.logs)
    .flatten()
    .map(log => ({ ...log, removed }))
    .map(mustBeValidLog)
    .sortBy(({ logIndex }) => new BigNumber(logIndex).toNumber())
    .value();

  const decodedLogs = await Promise.all(validatedLogs.map(decodeLog));

  await flushLogMessagesToQueue(removed ? decodedLogs.reverse() : decodedLogs);

  logger.info({ message, count: validatedLogs.length }, 'flushed logs to queue');
}
