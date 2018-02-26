import { BlockStreamState } from '../model';
import logger from '../logger';
import { BLOCKSTREAM_STATE_TABLE, NETWORK_ID } from '../env';
import { DynamoDB } from 'aws-sdk';
import { BlockWithTransactionHashes } from '../../client/model';
import BigNumber from 'bignumber.js';

const ddbClient = new DynamoDB.DocumentClient();

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

export async function saveBlockStreamState(prevState: BlockStreamState | null, reconciledBlock: Pick<BlockWithTransactionHashes, 'hash' | 'number'>, isRewind: boolean): Promise<void> {
  // build the input parameters
  const Item: BlockStreamState = {
    networkId: NETWORK_ID,
    blockHash: reconciledBlock.hash,
    blockNumber: (new BigNumber(reconciledBlock.number)).valueOf(),
    timestamp: (new Date()).getTime(),
    rewindCount: Math.max(
      (prevState === null ? 0 : prevState.rewindCount) +
      (isRewind ? 1 : -1),
      0
    )
  };

  let input: DynamoDB.DocumentClient.PutItemInput = {
    TableName: BLOCKSTREAM_STATE_TABLE,
    Item
  };

  // add conditions to the expression if there's a previous state
  if (prevState !== null) {
    input = {
      ...input,
      ConditionExpression: '#networkId = :networkId AND #blockHash = :blockHash AND #blockNumber = :blockNumber',
      ExpressionAttributeNames: {
        '#networkId': 'networkId',
        '#blockHash': 'blockHash',
        '#blockNumber': 'blockNumber'
      },
      ExpressionAttributeValues: {
        ':networkId': prevState.networkId,
        ':blockHash': prevState.blockHash,
        ':blockNumber': prevState.blockNumber
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
