import { BlockStreamState } from './model';
import BigNumber from 'bignumber.js';
import { BlockNumber } from './to-hex';

/**
 * Get the number of the next block to fetch
 */
export default function getNextFetchBlock(state: BlockStreamState | null, currentBlockNo: BlockNumber, lookback: number): BigNumber {
  if (state === null) {
    return (new BigNumber(currentBlockNo)).minus(lookback);
  }

  // just return the next unknown block
  return (new BigNumber(state.blockNumber)).plus(1);
}
