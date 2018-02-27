import { Log } from '../../client/model';
import getAbi from './get-abi';

export interface DecodedLog extends Log {
  ethercast: {}
}

export default async function decodeLog(log: Log): Promise<DecodedLog> {
  const abi = await getAbi(log.address);

  return { ...log, ethercast: {} };
}