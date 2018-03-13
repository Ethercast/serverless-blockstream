import { DecodedLog, Log } from '@ethercast/model';
import getAbi from './get-abi';
import logger from '../logger';
import { decodeLogParameters } from './decoder';
import { Abi } from '../../etherscan/etherscan-model';

export default async function decodeLog(log: Log): Promise<Log | DecodedLog> {
  let abi: Abi | null;
  try {
    abi = await getAbi(log.address);

    if (abi === null) {
      return log;
    }

  } catch (err) {
    logger.info({ err, log }, `error fetching abi`);
    return log;
  }

  // first find the matching signature
  try {
    const decoded = decodeLogParameters(log, abi);

    logger.debug({ decoded, log }, 'successfully decoded log');

    return decoded;
  } catch (err) {
    logger.error({ err }, 'failed to decode log');

    return log;
  }
}