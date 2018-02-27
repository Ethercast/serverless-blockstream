import { BlockStreamState } from '../model';
import logger from '../logger';
import { BLOCKSTREAM_STATE_TABLE, NETWORK_ID, STATE_HEIGHT_LIMIT } from '../env';
import { DynamoDB } from 'aws-sdk';
import { BlockWithTransactionHashes } from '../../client/model';
import BigNumber from 'bignumber.js';
import { ddbClient } from './shared';
import _ = require('underscore');

export async function getBlockStreamState(): Promise<BlockStreamState | null> {
  try {
    const { Item } = await ddbClient.get({
      TableName: BLOCKSTREAM_STATE_TABLE,
      Key: {
        networkId: NETWORK_ID
      },
      ConsistentRead: true
    }).promise();

    if (!Item || Item.networkId !== NETWORK_ID) {
      return null;
    }

    return Item as BlockStreamState;
  } catch (err) {
    logger.error({ err }, 'failed to fetch blockstream state');
    throw err;
  }
}

export async function saveBlockStreamState(prevState: BlockStreamState | null, reconciledBlock: Pick<BlockWithTransactionHashes, 'hash' | 'number'>): Promise<void> {
  // Construct the new state from the target block metadata and the previous state
  const Item: BlockStreamState = {
    networkId: NETWORK_ID,
    index: prevState ? prevState.index + 1 : 0,
    blockHash: reconciledBlock.hash,
    blockNumber: (new BigNumber(reconciledBlock.number)).valueOf(),
    timestamp: (new Date()).getTime(),
    history: (
      prevState ? (
        [_.pick(prevState, 'index', 'blockHash', 'blockNumber', 'timestamp')]
          .concat(prevState.history)
      ) : []
    ).slice(0, STATE_HEIGHT_LIMIT)
  };

  let input: DynamoDB.DocumentClient.PutItemInput = {
    TableName: BLOCKSTREAM_STATE_TABLE,
    Item
  };

  // add conditions to the expression if there's a previous state
  if (prevState !== null) {
    input = {
      ...input,
      ConditionExpression: '#networkId = :networkId AND #blockHash = :blockHash AND #blockNumber = :blockNumber and #index = :index',
      ExpressionAttributeNames: {
        '#networkId': 'networkId',
        '#blockHash': 'blockHash',
        '#blockNumber': 'blockNumber',
        '#index': 'index'
      },
      ExpressionAttributeValues: {
        ':networkId': prevState.networkId,
        ':blockHash': prevState.blockHash,
        ':blockNumber': prevState.blockNumber,
        ':index': prevState.index
      }
    };
  }

  try {
    logger.debug({ input }, 'saving blockstream state');

    await ddbClient.put(input).promise();
  } catch (err) {
    logger.error({ err, input }, 'failed to save blockstream state');

    throw err;
  }
}
