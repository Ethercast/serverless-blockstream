import calculateNumRewinds from '../src/util/state/calculate-num-rewinds';
import { BlockStreamState } from '../src/util/model';
import { expect } from 'chai';

function generateBlockStateHistory(...numbers: number[]): BlockStreamState {
  return {
    timestamp: new Date().getTime(),
    index: numbers.length - 1,
    blockNumber: '' + numbers[numbers.length - 1],
    networkId: 1,
    blockHash: 'abc',

    history: numbers.slice(0, numbers.length - 1)
      .reverse()
      .map(
        (num, ix) => ({
          blockHash: 'abc',
          timestamp: new Date().getTime(),
          index: numbers.length - 1 - ix,
          blockNumber: '' + num
        })
      )
  };
}

describe('calculateNumRewinds', () => {
  it('is correct with 0 blocks', () => {
    expect(
      calculateNumRewinds(generateBlockStateHistory(1))
    ).to.eq(0);
  });

  it('is still 0 with a couple rewinds in the middle', () => {
    expect(
      calculateNumRewinds(generateBlockStateHistory(1, 2, 3, 4, 3, 2, 3, 4, 5))
    ).to.eq(0);
  });

  it('is 0 if we not start at 0', () => {
    expect(
      calculateNumRewinds(generateBlockStateHistory(5, 6, 7))
    ).to.eq(0);
  });

  it('is correct about 1 rewind', () => {
    expect(
      calculateNumRewinds(generateBlockStateHistory(5, 6, 5))
    ).to.eq(1);
  });

  it('is correct about 2 rewinds', () => {
    expect(
      calculateNumRewinds(generateBlockStateHistory(5, 6, 5, 4))
    ).to.eq(2);
  });

  it('is correct about 2 rewinds and 1 forward === 0', () => {
    expect(
      calculateNumRewinds(generateBlockStateHistory(5, 6, 5, 4, 5))
    ).to.eq(0);
  });

  it('is correct about 3 rewinds', () => {
    expect(
      calculateNumRewinds(generateBlockStateHistory(5, 6, 5, 4, 5, 4, 3, 2))
    ).to.eq(3);
  });

  it('is correct about 5 rewinds', () => {
    expect(
      calculateNumRewinds(generateBlockStateHistory(5, 6, 5, 4, 5, 4, 3, 2, 1, 0))
    ).to.eq(5);
  });

  it('properly handles a full chain of rewinds', () => {
    expect(
      calculateNumRewinds(generateBlockStateHistory(5, 4, 3, 2, 1))
    ).to.eq(4);
  });
});