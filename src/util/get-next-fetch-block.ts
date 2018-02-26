import { BlockStreamState } from './model';
import BigNumber from 'bignumber.js';
import { BlockNumber } from './to-hex';

/**
 * Get the number of the next block to fetch
 */
export default function getNextFetchBlock(state: BlockStreamState | null, currentBlockNo: BlockNumber): BigNumber {
  if (state === null) {
    return new BigNumber(currentBlockNo);
  }

  const lastBlockNo = new BigNumber(state.blockNumber);

  if (lastBlockNo.gte(currentBlockNo)) {
    return lastBlockNo.plus(1);
  }

  return new BigNumber(currentBlockNo);
}
