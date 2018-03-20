import { Log, mustBeValidLog, mustBeValidTransaction, Transaction } from '@ethercast/model';
import * as SNS from 'aws-sdk/clients/sns';
import * as SQS from 'aws-sdk/clients/sqs';
import { Message } from 'aws-sdk/clients/sqs';
import BigNumber from 'bignumber.js';
import * as Logger from 'bunyan';
import * as crypto from 'crypto';
import decodeLog from './abi/decode-log';
import getAbiAndDecodeTransaction from './abi/decode-transaction';
import { getBlock } from './ddb/block-data';
import { BLOCK_PROCESSED_TOPIC_NAME, LOG_FIREHOSE_QUEUE_NAME, TRANSACTION_FIREHOSE_QUEUE_NAME } from './env';
import { BlockQueueMessage } from './model';
import getTopicArn from './sns/get-topic-arn';
import flushMessagesToQueue from './sqs/flush-to-queue';
import _ = require('underscore');

function logMessageId(log: Log) {
  return crypto.createHash('sha256')
    .update(log.blockHash)
    .update(log.transactionHash)
    .update(log.logIndex)
    .update(log.removed ? 'removed' : 'new')
    .digest('hex');
}

function flushLogMessagesToQueue(sqs: SQS, logger: Logger, validatedLogs: Log[]): Promise<void> {
  return flushMessagesToQueue(sqs, logger, LOG_FIREHOSE_QUEUE_NAME, validatedLogs, logMessageId);
}

// includes the flag for whether it was removed or added
interface TransactionMessage extends Transaction {
  removed: boolean;
}

function transactionMessageId(transaction: TransactionMessage) {
  return `${transaction.hash}-${transaction.removed}`;
}

function flushTransactionMessagesToQueue(sqs: SQS, logger: Logger, validatedTransactions: TransactionMessage[]): Promise<void> {
  return flushMessagesToQueue(sqs, logger, TRANSACTION_FIREHOSE_QUEUE_NAME, validatedTransactions, transactionMessageId);
}

export default async function processQueueMessage(sqs: SQS, sns: SNS, logger: Logger, { Body, MessageId, ReceiptHandle }: Message): Promise<void> {
  if (!ReceiptHandle || !Body) {
    logger.error({ MessageId, ReceiptHandle, Body }, 'message received with no body/receipt handle');
    throw new Error('No receipt handle/body!');
  }

  logger.debug({ Body }, 'processing message');

  const message = JSON.parse(Body) as BlockQueueMessage;
  const { hash, number, removed } = message;

  // create a logger for this message
  const msgLogger = logger.child({ MessageId, message });

  msgLogger.info('processing message');

  // first get all the blocks that have this number
  const blockPayload = await getBlock(hash, number);

  if (!blockPayload) {
    msgLogger.error('block not found');
    throw new Error(`block not found with hash ${hash} and number ${number}`);
  }

  msgLogger.debug({
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

  msgLogger.debug({ logCount: validatedLogs.length }, 'validated logs');

  const validatedTransactions: Transaction[] = _.chain(blockPayload.block.transactions)
    .map(mustBeValidTransaction)
    .value();

  msgLogger.debug({ transactionCount: validatedTransactions.length }, 'validated transactions');

  const [ decodedLogs, decodedTransactions ] = await Promise.all([
    Promise.all(validatedLogs.map(decodeLog)),
    Promise.all(validatedTransactions.map(getAbiAndDecodeTransaction))
  ]);

  msgLogger.debug('decoded transactions and logs');

  const transactionMessages: TransactionMessage[] = decodedTransactions.map(transaction => ({
    ...transaction,
    removed
  }));

  msgLogger.debug('flushing messages to queue');

  await Promise.all([
    flushLogMessagesToQueue(sqs, logger, removed ? decodedLogs.reverse() : decodedLogs),
    flushTransactionMessagesToQueue(sqs, logger, removed ? transactionMessages.reverse() : transactionMessages)
  ]);

  msgLogger.info({
    transactionCount: transactionMessages.length,
    logCount: decodedLogs.length
  }, 'flushed messages to queues');

  const TopicArn = await getTopicArn(sns, BLOCK_PROCESSED_TOPIC_NAME);
  await sns.publish({ TopicArn, Message: JSON.stringify(message) }).promise();

  msgLogger.info('completed message processing');
}
