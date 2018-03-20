import { DecodedTransaction, Transaction } from '@ethercast/model';
import logger from '../logger';
import { decodeTransactionParameters } from './decoder';
import getAbi from './get-abi';

export default async function getAbiAndDecodeTransaction(transaction: Transaction): Promise<Transaction | DecodedTransaction> {
  try {
    // no data, not a method call with parameters we can parse
    if (!transaction.input || transaction.input === '0x') {
      return transaction;
    }

    if (transaction.to === null) {
      return transaction;
    }

    const abi = await getAbi(transaction.to);

    if (abi === null) {
      return transaction;
    }

    try {
      const decoded = decodeTransactionParameters(transaction, abi);

      logger.debug({ decoded, address: transaction.to }, 'successfully decoded log');

      return decoded;
    } catch (err) {
      logger.warn({ transaction, err }, 'failed to decode transaction');

      return transaction;
    }
  } catch (err) {
    logger.debug({ err, transaction }, `error decoding transaction`);
    return transaction;
  }
}