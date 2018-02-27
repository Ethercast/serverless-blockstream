import { Abi } from '../../etherscan/etherscan-model';
import { getSavedAbi, markAbiNotAvailable, saveAbi } from '../ddb/abi';
import logger from '../logger';
import { getEtherscanAbi } from '../../etherscan/etherscan-client';
import { ETHERSCAN_API_KEY, ETHERSCAN_API_URL } from '../env';

const abiCache: { [address: string]: Promise<Abi | null> } = {};

/**
 * This function does in-memory caching, then goes to dynamo, then goes to etherscan
 */
export default function getAbi(address: string): Promise<Abi | null> {
  if (abiCache[address]) {
    return abiCache[address];
  }

  return (
    abiCache[address] = getAbiInternal(address)
  );
}

async function getAbiInternal(address: string): Promise<Abi | null> {
  let abi: Abi | null = null;

  // first try the database
  try {
    abi = await getSavedAbi(address);

    if (abi === null) {
      return null;
    }
  } catch (err) {
    logger.info({ err }, `abi not yet in dynamo: ${address}`);
  }

  try {
    abi = await getEtherscanAbi(address, ETHERSCAN_API_URL, ETHERSCAN_API_KEY);
  } catch (err) {
    logger.info({ err }, `abi not available in etherscan`);

    await markAbiNotAvailable(address);

    return null;
  }

  try {
    await saveAbi(address, abi);
  } catch (err) {
    logger.info({ err }, `failed to save abi for address: ${address}`);
  }

  return abi;
}