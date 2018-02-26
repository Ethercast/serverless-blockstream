import { BlockStreamState } from './model';
import BigNumber from 'bignumber.js';

/**
 * Get the number of the next block to fetch
 */
export default function getNextFetchBlock(state: BlockStreamState | null, startingBlock: number): BigNumber {
  if (!state) {
    return new BigNumber(startingBlock);
  }

  const lastBlockNo = new BigNumber(state.blockNumber);

  if (lastBlockNo.gte(startingBlock)) {
    return lastBlockNo.plus(1);
  }

  return new BigNumber(startingBlock);
}
