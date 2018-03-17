import { Abi, JoiAbi } from '../../etherscan/etherscan-model';
import { ABI_TABLE } from '../env';
import { ddbClient } from './shared';

export async function getSavedAbi(address: string): Promise<Abi | null> {
  const { Item } = await ddbClient.get({
    TableName: ABI_TABLE,
    Key: {
      address: address.toLowerCase()
    }
  }).promise();

  if (!Item || !Item.address || Item.address.toLowerCase() !== address.toLowerCase()) {
    throw new Error(`abi address not found in database: ${address}`);
  }

  return Item.abi === null ?
    null :
    JSON.parse(Item.abi);
}

export async function markAbiNotAvailable(address: string): Promise<void> {
  await ddbClient.put({
    TableName: ABI_TABLE,
    Item: {
      address: address.toLowerCase(),
      abi: null,
      // Cache missing ABIs for one day.
      ttl: Math.round((Date.now() + (86400 * 1000)) / 1000)
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
      address: address.toLowerCase(),
      abi: JSON.stringify(value)
    }
  }).promise();
}