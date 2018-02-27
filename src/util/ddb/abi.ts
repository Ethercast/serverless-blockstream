import { Abi, JoiAbi } from '../../etherscan/etherscan-model';
import { ddbClient } from './shared';
import { ABI_TABLE } from '../env';

export async function getSavedAbi(address: string): Promise<Abi> {
  const { Item } = await ddbClient.get({
    TableName: ABI_TABLE,
    Key: {
      address
    }
  }).promise();

  if (!Item || !Item.address || Item.address !== address) {
    throw new Error(`abi address not found in database: ${address}`);
  }

  const { error, value } = JoiAbi.validate(Item);

  if (error && error.details.length) {
    throw new Error(`abi pulled out of db did not pass validation: ${JSON.stringify(error)}`);
  }

  return value as Abi;
}

export async function saveAbi(abi: Abi): Promise<void> {
  const { value, error } = JoiAbi.validate(abi);

  if (error && error.details.length) {
    throw new Error(`ABI did not pass validation: ${JSON.stringify(error.details)}`);
  }

  await ddbClient.put({
    TableName: ABI_TABLE,
    Item: value
  }).promise();
}