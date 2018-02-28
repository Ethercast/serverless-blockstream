import { Log } from '../../client/model';
import getAbi from './get-abi';
import logger from '../logger';
import { decodeLog as decodeWithAbi, encodeEventSignature } from 'web3-eth-abi';
import _ = require('underscore');

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

    // first find the matching signature
    const matchingSignature = _.find(
      abi,
      ({ name, inputs, type, anonymous }) =>
        // TODO: We can't support anonymous events!
        !anonymous &&
        type === 'event' &&
        encodeEventSignature(
          `${name}(${inputs.map(({ type }) => type).join(',')})`
        ) === log.topics[0]
    );

    if (!matchingSignature) {
      logger.warn({
        address: log.address,
        topic: log.topics[0]
      }, 'found abi but failed to find matching event signature');

      return log;
    }

    return {
      ...log,
      ethercast: decodeWithAbi(matchingSignature.inputs, log.data, log.topics)
    };
  } catch (err) {
    logger.debug({ err, address: log.address }, `error getting abi`);
    return log;
  }
}