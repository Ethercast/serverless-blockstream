import { BlockStreamState } from '../model';
import BigNumber from 'bignumber.js';

export default function calculateNumRewinds(state: BlockStreamState) {
  let blockNumber = new BigNumber(state.blockNumber);
  let rewinds = 0;

  while (state.history.length > rewinds && blockNumber.minus(state.history[rewinds].blockNumber).eq(-1)) {
    blockNumber = new BigNumber(state.history[rewinds].blockNumber);
    rewinds++;
  }

  return rewinds;
}