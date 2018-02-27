import { Log } from '../../client/model';
import getAbi from './get-abi';
import logger from '../logger';

export interface DecodedLog extends Log {
  ethercast?: {
    [parameter: string]: string | number
  }
}

export default async function decodeLog(log: Log): Promise<DecodedLog> {
  try {
    const abi = await getAbi(log.address);

    if (abi === null) {
      return log;
    }

    logger.info({ abi, address: log.address }, `found abi for address`);

    return { ...log, ethercast: {} };
  } catch (err) {
    logger.debug({ err }, `no abi for address: ${log.address}`);
    return log;
  }
}