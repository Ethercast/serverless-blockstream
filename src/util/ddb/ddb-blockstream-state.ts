import { BlockStreamState } from '../model';
import logger from '../logger';
import { BLOCKSTREAM_STATE_TABLE, NETWORK_ID } from '../env';
import { DynamoDB } from 'aws-sdk';

const ddbClient = new DynamoDB.DocumentClient();

export async function getBlockStreamState(): Promise<BlockStreamState | null> {
  try {
    const { Item } = await ddbClient.get({
      TableName: BLOCKSTREAM_STATE_TABLE,
      Key: {
        network_id: NETWORK_ID
      },
      ConsistentRead: true
    }).promise();

    if (!Item || Item.network_id !== NETWORK_ID) {
      return null;
    }

    return Item as BlockStreamState;
  } catch (err) {
    logger.error({ err }, 'failed to fetch blockstream state');
    throw err;
  }
}

export async function saveBlockStreamState(prevState: BlockStreamState | null, nextState: BlockStreamState): Promise<void> {
  // build the input parameters
  let input: DynamoDB.DocumentClient.PutItemInput = {
    TableName: BLOCKSTREAM_STATE_TABLE,
    Item: nextState
  };

  // add conditions to the expression if there's a previous state
  if (prevState !== null) {
    input = {
      ...input,
      ConditionExpression: '#network_id = :network_id AND #lastReconciledBlock.#hash = :hash AND #lastReconciledBlock.#number = :number',
      ExpressionAttributeNames: {
        '#network_id': 'network_id',
        '#lastReconciledBlock': 'lastReconciledBlock',
        '#hash': 'hash',
        '#number': 'number'
      },
      ExpressionAttributeValues: {
        ':network_id': prevState.network_id,
        ':hash': prevState.lastReconciledBlock.hash,
        ':number': prevState.lastReconciledBlock.number
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
