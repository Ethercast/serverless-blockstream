import { DecodedLog, DecodedTransaction, Log, Transaction } from '@ethercast/model';
import { decodeLog, decodeParameters, encodeEventSignature, encodeFunctionSignature } from 'web3-eth-abi';
import * as _ from 'underscore';
import { Abi } from '../../etherscan/etherscan-model';

export function decodeTransactionParameters(transaction: Transaction, abi: Abi): DecodedTransaction {
  const methodSignature = transaction.input.substr(0, 10).toLowerCase();
  const encodedParameters = `0x${transaction.input.substr(10).toLowerCase()}`;

  // first find the matching signature
  const matchingSignature = _.find(
    abi,
    abiSignature =>
      abiSignature.type === 'function' &&
      !abiSignature.anonymous &&
      encodeFunctionSignature(abiSignature)
        .toLowerCase() === methodSignature
  );

  if (!matchingSignature) {
    throw new Error('found abi but failed to find matching function signature');
  }

  if (_.any(matchingSignature.inputs || [], ({ type }) => type.toLowerCase() === 'uint8[]')) {
    throw new Error('currently not supporting uint8[] decoding');
  }
  const parameters = decodeParameters(matchingSignature.inputs || [], encodedParameters);

  return {
    ...transaction,
    ethercast: {
      methodName: matchingSignature.name || '',
      parameters
    }
  };
}

export function decodeLogParameters(log: Log, abi: Abi): DecodedLog {
  // first find the matching signature
  const matchingSignature = _.find(
    abi,
    abiSignature =>
      abiSignature.type === 'event' &&
      !abiSignature.anonymous &&
      encodeEventSignature(abiSignature) === log.topics[ 0 ]
  );

  if (!matchingSignature) {
    throw new Error('found abi but failed to find matching event signature');
  }

  const parameters = decodeLog(matchingSignature.inputs, log.data, log.topics);

  return {
    ...log,
    ethercast: {
      eventName: matchingSignature.name || '',
      parameters
    }
  };
}