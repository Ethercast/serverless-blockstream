import logger from './logger';
import * as SQS from 'aws-sdk/clients/sqs';
import { Message } from 'aws-sdk/clients/sqs';
import { BlockQueueMessage } from './model';
import { getBlock } from './ddb/block-data';
import { LOG_FIREHOSE_QUEUE_NAME, TRANSACTION_FIREHOSE_QUEUE_NAME } from './env';
import * as crypto from 'crypto';
import { Log, mustBeValidLog, mustBeValidTransaction, Transaction } from '@ethercast/model';
import BigNumber from 'bignumber.js';
import decodeLog from './abi/decode-log';
import flushMessagesToQueue from './sqs/flush-to-queue';
import decodeTransaction from './abi/decode-transaction';
import _ = require('underscore');

const sqs = new SQS();

function logMessageId(log: Log) {
  return crypto.createHash('sha256')
    .update(log.blockHash)
    .update(log.transactionHash)
    .update(log.logIndex)
    .update(log.removed ? 'removed' : 'new')
    .digest('hex');
}

function flushLogMessagesToQueue(validatedLogs: Log[]): Promise<void> {
  return flushMessagesToQueue(sqs, LOG_FIREHOSE_QUEUE_NAME, validatedLogs, logMessageId);
}

// includes the flag for whether it was removed or added
interface TransactionMessage extends Transaction {
  removed: boolean;
}

function transactionMessageId(transaction: TransactionMessage) {
  return `${transaction.hash}-${transaction.removed}`;
}

function flushTransactionMessagesToQueue(validatedTransactions: TransactionMessage[]): Promise<void> {
  return flushMessagesToQueue(sqs, TRANSACTION_FIREHOSE_QUEUE_NAME, validatedTransactions, transactionMessageId);
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
    throw new Error(`block not found with hash ${hash} and number ${number}`);
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

  const validatedTransactions: Transaction[] = _.chain(blockPayload.block.transactions)
    .map(mustBeValidTransaction)
    .value();

  const [decodedLogs, decodedTransactions] = await Promise.all([
    Promise.all(validatedLogs.map(decodeLog)),
    Promise.all(validatedTransactions.map(decodeTransaction))
  ]);

  const transactionMessages: TransactionMessage[] = decodedTransactions.map(transaction => ({
    ...transaction,
    removed
  }));

  await Promise.all([
    flushLogMessagesToQueue(removed ? decodedLogs.reverse() : decodedLogs),
    flushTransactionMessagesToQueue(removed ? transactionMessages.reverse() : transactionMessages)
  ]);

  logger.info({ message, count: validatedLogs.length }, 'flushed logs to queue');
}
