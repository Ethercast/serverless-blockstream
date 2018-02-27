import { Abi } from '../../etherscan/etherscan-model';
import { getSavedAbi, saveAbi } from '../ddb/abi';
import logger from '../logger';
import { getEtherscanAbi } from '../../etherscan/etherscan-client';
import { ETHERSCAN_API_KEY, ETHERSCAN_API_URL } from '../env';

const abiCache: { [address: string]: Promise<Abi> } = {};

/**
 * This function does in-memory caching, then goes to dynamo, then goes to etherscan
 */
export default function getAbi(address: string): Promise<Abi> {
  if (abiCache[address]) {
    return abiCache[address];
  }

  return (
    abiCache[address] = new Promise(async (resolve, reject) => {
      try {
        const abi: Abi = await getSavedAbi(address);

        resolve(abi);
        return;
      } catch (err) {
        logger.debug({ err }, `failed to get saved abi for address out of dynamo: ${address}`);
      }

      try {
        const abi: Abi = await getEtherscanAbi(address, ETHERSCAN_API_URL, ETHERSCAN_API_KEY);

        await saveAbi(abi);

        resolve(abi);
        return;
      } catch (err) {
        logger.debug({ err }, `failed to get abi for address: ${address}`);
        reject(new Error(`could not find abi for address: ${address}`));
      }
    })
  );
}