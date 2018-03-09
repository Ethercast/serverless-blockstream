import { DecodedLog, Log } from '@ethercast/model';
import getAbi from './get-abi';
import logger from '../logger';
import { decodeLog as decodeWithAbi, encodeEventSignature } from 'web3-eth-abi';
import _ = require('underscore');

export default async function decodeLog(log: Log): Promise<Log | DecodedLog> {
  try {
    const abi = await getAbi(log.address);

    if (abi === null) {
      return log;
    }

    // first find the matching signature
    const matchingSignature = _.find(
      abi,
      abiSignature =>
        abiSignature.type === 'event' &&
        !abiSignature.anonymous &&
        encodeEventSignature(abiSignature) === log.topics[0]
    );

    if (!matchingSignature) {
      logger.warn({
        address: log.address,
        topic: log.topics[0]
      }, 'found abi but failed to find matching event signature');

      return log;
    }

    const parameters = decodeWithAbi(matchingSignature.inputs, log.data, log.topics);

    logger.debug({ parameters, log }, 'successfully decoded log');

    return {
      ...log,
      ethercast: {
        eventName: matchingSignature.name,
        parameters
      }
    };
  } catch (err) {
    logger.warn({ err, log }, `error decoding log`);
    return log;
  }
}