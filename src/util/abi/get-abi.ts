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
    logger.debug({ address }, 'abi request cached, returning result');
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
    logger.debug({ address }, 'fetching abi from dynamo');
    abi = await getSavedAbi(address);

    if (abi === null) {
      logger.debug({ address }, 'abi does not exist in dynamo');
      return null;
    }
  } catch (err) {
    logger.info({ err, address }, `abi not yet in dynamo`);
  }

  try {
    abi = await getEtherscanAbi(address, ETHERSCAN_API_URL, ETHERSCAN_API_KEY);

    if (abi === null) {
      logger.info({ address }, `abi not available in etherscan, marking unavailable`);

      try {
        await markAbiNotAvailable(address);
      } catch (err) {
        logger.error({ err, address }, 'failed to mark abi not available in dynamo');
      }

      return null;
    }
  } catch (err) {
    logger.error({ err, address }, 'failed to get abi from etherscan');
    return null;
  }

  try {
    await saveAbi(address, abi);
  } catch (err) {
    logger.error({ err, address }, `failed to save abi for address`);
  }

  return abi;
}