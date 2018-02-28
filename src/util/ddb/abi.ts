import { Abi, JoiAbi } from '../../etherscan/etherscan-model';
import { ddbClient } from './shared';
import { ABI_TABLE } from '../env';

export async function getSavedAbi(address: string): Promise<Abi | null> {
  const { Item } = await ddbClient.get({
    TableName: ABI_TABLE,
    Key: {
      address
    }
  }).promise();

  if (!Item || !Item.address || Item.address !== address) {
    throw new Error(`abi address not found in database: ${address}`);
  }

  return Item.abi;
}

export async function markAbiNotAvailable(address: string): Promise<void> {
  await ddbClient.put({
    TableName: ABI_TABLE,
    Item: {
      address,
      abi: null,
      // Cache ABIs for one day.
      ttl: Date.now() + (86400 * 1000)
    }
  }).promise();
}

export async function saveAbi(address: string, abi: Abi): Promise<void> {
  const { value, error } = JoiAbi.validate(abi);

  if (error && error.details.length) {
    throw new Error(`ABI for address ${address} did not pass validation: ${JSON.stringify(error.details)}`);
  }

  await ddbClient.put({
    TableName: ABI_TABLE,
    Item: {
      address,
      abi: value
    }
  }).promise();
}