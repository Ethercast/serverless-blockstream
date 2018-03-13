import { Abi } from '../../etherscan/etherscan-model';
import { getSavedAbi, markAbiNotAvailable, saveAbi } from '../ddb/abi';
import logger from '../logger';
import { getEtherscanAbi } from '../../etherscan/etherscan-client';
import { ETHERSCAN_API_KEY, ETHERSCAN_API_URL } from '../env';

const ABI_CACHE: { [address: string]: Promise<Abi | null> } = {};

/**
 * This function does in-memory caching, then goes to dynamo, then goes to etherscan
 */
export default function getAbi(address: string): Promise<Abi | null> {
  if (ABI_CACHE[address]) {
    logger.debug({ address }, 'abi request cached, returning result');
    return ABI_CACHE[address];
  }

  return (
    ABI_CACHE[address] = getAbiInternal(address)
  );
}

async function getAbiInternal(address: string): Promise<Abi | null> {
  let abi: Abi | null = null;

  // first try the database
  try {
    logger.debug({ address }, 'fetching abi from dynamo');
    abi = await getSavedAbi(address);

    if (abi === null) {
      logger.debug({ address }, 'dynamo indicates the address does not have an abi');
      return null;
    }
  } catch (err) {
    logger.debug({ err, address }, `abi not yet in dynamo`);
  }

  try {
    abi = await getEtherscanAbi(address, ETHERSCAN_API_URL, ETHERSCAN_API_KEY);

    if (abi === null) {
      logger.debug({ address }, `abi not available in etherscan, marking unavailable`);

      try {
        await markAbiNotAvailable(address);
      } catch (err) {
        logger.error({ err, address }, 'failed to mark abi not available in dynamo');
      }

      return null;
    }
  } catch (err) {
    // This indicates that etherscan gaves us a bad status code.
    logger.info({ err, address }, 'failed to get abi from etherscan');
    return null;
  }

  try {
    await saveAbi(address, abi);
  } catch (err) {
    logger.error({ err, address }, `failed to save abi for address`);
  }

  return abi;
}