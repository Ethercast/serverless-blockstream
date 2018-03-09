import { DecodedTransaction, Transaction } from '@ethercast/model';
import getAbi from './get-abi';
import logger from '../logger';
import { decodeParameters as decodeWithAbi, encodeFunctionSignature } from 'web3-eth-abi';
import _ = require('underscore');

export default async function decodeTransaction(transaction: Transaction): Promise<Transaction | DecodedTransaction> {
  try {
    // no data, not a method call with parameters we can parse
    if (!transaction.input) {
      return transaction;
    }

    if (transaction.to === null) {
      return transaction;
    }

    const abi = await getAbi(transaction.to);

    if (abi === null) {
      return transaction;
    }

    const methodSignature = transaction.input.substr(0, 10).toLowerCase();
    const encodedParameters = `0x${transaction.input.substr(10).toLowerCase()}`;

    // first find the matching signature
    const matchingSignature = _.find(
      abi,
      abiSignature =>
        abiSignature.type === 'function' &&
        !abiSignature.anonymous &&
        encodeFunctionSignature(abiSignature).toLowerCase() === methodSignature
    );

    if (!matchingSignature) {
      logger.warn({
        address: transaction.to,
        methodSignature,
        input: transaction.input
      }, 'found abi but failed to find matching function signature');

      return transaction;
    }

    const parameters = decodeWithAbi(matchingSignature.inputs, encodedParameters);

    logger.debug({
      address: transaction.to,
      methodSignature,
      encodedParameters,
      parameters
    }, 'successfully decoded log');

    return {
      ...transaction,
      ethercast: {
        methodName: matchingSignature.name,
        parameters: parameters
      }
    };
  } catch (err) {
    logger.debug({ err, transaction }, `error decoding transaction`);
    return transaction;
  }
}