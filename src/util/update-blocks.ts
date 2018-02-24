import logger from './logger';
import BigNumber from 'bignumber.js';
import * as _ from 'underscore';
import { saveBlockData, blockExists } from './ddb/ddb-block-data';
import EthClient from '../client/eth-client';
import { NETWORK_ID, STARTING_BLOCK, DRAIN_QUEUE_LAMBDA_NAME, SQS_BLOCK_RECEIVED_QUEUE_NAME } from './env';
import { Lambda } from 'aws-sdk';
import { BlockQueueMessage, BlockWithTransactionHashes, Log } from './model';
import toHex from './to-hex';
import getNextFetchBlock from './get-next-fetch-block';
import { getQueueUrl, sqs } from './sqs/sqs-util';
import { getBlockStreamState, saveBlockStreamState } from './ddb/ddb-blockstream-state';

const lambda = new Lambda();

/**
 * This function is executed on a loop and reconciles one block worth of data
 */
export default async function reconcileBlocks(client: EthClient): Promise<void> {
  const state = await getBlockStreamState();
  const nextFetchBlock = await getNextFetchBlock(state, STARTING_BLOCK);
  const currentBlockNo = await client.eth_blockNumber();

  if (currentBlockNo.lt(nextFetchBlock)) {
    logger.debug({
      currentBlockNo,
      nextFetchBlock
    }, 'next fetch block is not yet available');
    return;
  }

  const blocksToCurrent = currentBlockNo.minus(nextFetchBlock);

  if (blocksToCurrent.gt(10000)) {
    logger.fatal('MORE THAN 10K BLOCKS BEHIND THE NETWORK. WILL NEVER CATCH UP');
    return;
  } else  if (blocksToCurrent.gt(1000)) {
    logger.error('more than 1000 blocks behind the network! it could take a while to catch up!');
  } else if (blocksToCurrent.gt(100)) {
    logger.error('more than 100 blocks behind the network!');
  } else if (blocksToCurrent.gt(10)) {
    logger.warn('more than 10 blocks behind the network.');
  }

  logger.debug({ currentBlockNo, nextFetchBlock }, 'fetching block');

  // get the block info and all the logs for the block
  const [block, logs]: [BlockWithTransactionHashes | null, Log[]] = await Promise.all([
    client.eth_getBlockByNumber(nextFetchBlock, false),
    client.eth_getLogs({ fromBlock: nextFetchBlock, toBlock: nextFetchBlock })
  ]);

  // missing block, try again later
  if (block === null) {
    logger.debug({ currentBlockNo, nextFetchBlock }, 'block came back as null');
    return;
  }

  const metadata = {
    state,
    blockHash: block.hash,
    blockNumber: block.number,
    logCount: logs.length,
    transactionCount: block.transactions.length,
    parentHash: block.parentHash
  };

  logger.info({ metadata }, 'fetched block data');

  // if any logs are not for this block, we encountered a race condition, try again later. log everything
  // since this rarely happens
  if (_.any(logs, ({ blockHash }) => blockHash !== block.hash)) {
    logger.warn({ metadata }, 'inconsistent logs: not all logs matched the block');
    logger.debug({ block, logs }, 'inconsistent logs');
    return;
  }

  if (_.any(logs, ({removed})=>removed)) {
    logger.error({metadata},'block received with a log already marked removed');
    return;
  }

  //  check if the parent exists and rewind blocks if it does not
  if (state) {
    const parentBlockNumber = toHex(new BigNumber(block.number).minus(1));
    const parentExists = await blockExists(block.parentHash, parentBlockNumber);

    if (!parentExists) {
      logger.info({
        metadata,
        parentBlockNumber
      }, 'parent doesnt exist, beginning rewind process');

      // the next block number to check
      let checkingBlockNumber = new BigNumber(parentBlockNumber).minus(1);

      // iterate through parent blocks reported by the node until we get to one that exists
      while (true) {
        // in this case, all our block data is bad.. this should never happen with at least 1 hour of history!
        if (checkingBlockNumber.lt(STARTING_BLOCK)) {
          logger.error(
            { checkingBlockNumber, metadata },
            'retraced and could not recover from a chain reorg!!! all our block data appears incorrect'
          );
          throw new Error('could not recover from chain reorg');
        }

        if (checkingBlockNumber.minus(state.lastReconciledBlock.number).abs().gt(50)) {
          logger.error(
            { checkingBlockNumber, metadata },
            'retraced back 50 blocks and could not find a block in dynamo'
          );
          throw new Error('failed to reconcile chain reorg within 50 blocks');
        }

        const block = await client.eth_getBlockByNumber(checkingBlockNumber, false);
        if (block === null) {
          logger.error({
            checkingBlockNumber
          }, 'ethereum node returned null while checking for parent block numbers during a chain reorg!');
          throw new Error('missing block number from node during chain reorg');
        }

        const exists = await blockExists(block.hash, block.number);

        // we can save the state, we've reconciled the chain reorg
        if (exists) {
          logger.info({
            checkingBlockNumber,
            metadata,
            block: { hash: block.hash, number: block.number }
          }, 'chain org reconciled, block found in dynamo that exists on the node');

          await saveBlockStreamState(
            null,
            {
              lastReconciledBlock: {
                hash: block.hash,
                number: block.number
              },
              network_id: NETWORK_ID
            }
          );
          break;
        }

        checkingBlockNumber = checkingBlockNumber.minus(1);
      }

      return;
    }
  }

  try {
    await saveBlockData(block, logs, state !== null);
  } catch (err) {
    logger.error({ err, metadata }, 'failed to save block data');
    return;
  }


  let QueueUrl: string;
  try {
    QueueUrl = await getQueueUrl(SQS_BLOCK_RECEIVED_QUEUE_NAME);
  } catch (err) {
    logger.error({ err }, 'could not find queue url: ' + SQS_BLOCK_RECEIVED_QUEUE_NAME);
    return;
  }

  try {
    const queueMessage: BlockQueueMessage = { hash: block.hash, number: block.number };

    const { MessageId } = await sqs.sendMessage({
      QueueUrl,
      MessageGroupId: `net-${NETWORK_ID}`,
      MessageDeduplicationId: block.hash,
      MessageBody: JSON.stringify(queueMessage)
    }).promise();

    logger.info({ queueMessage, MessageId }, 'placed message in queue');
  } catch (err) {
    logger.error({
      QueueName: SQS_BLOCK_RECEIVED_QUEUE_NAME,
      err,
      metadata
    }, 'failed to deliver block notification message to queue');
    return;
  }

  try {
    // LAST step: save the blockstream state
    await saveBlockStreamState(
      state,
      {
        lastReconciledBlock: {
          hash: block.hash,
          number: block.number
        },
        network_id: NETWORK_ID
      }
    );
  } catch (err) {
    // TODO: if this fails, should we retract the message we sent on the queue?
    logger.error({ err, metadata }, 'failed to update blockstream state');
    return;
  }

  // now trigger a lambda to drain the queue
  try {
    logger.debug({ metadata, DRAIN_QUEUE_LAMBDA_NAME }, 'invoking lambda asynchronously to drain queue');

    const { StatusCode } = await lambda.invoke({
      FunctionName: DRAIN_QUEUE_LAMBDA_NAME,
      InvocationType: 'Event'
    }).promise();

    if (StatusCode !== 202) {
      throw new Error(`failed to invoke lambda to drain the queue: StatusCode ${StatusCode}`);
    }

    logger.info({ metadata }, 'lambda successfully invoked');
  } catch (err) {
    logger.error({ DRAIN_QUEUE_LAMBDA_NAME, err, metadata }, 'failed to invoke lambda after pushing to queue');
    return;
  }
}
