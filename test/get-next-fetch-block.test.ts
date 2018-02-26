import { BlockStreamState } from '../src/util/model';
import { expect } from 'chai';
import getNextFetchBlock from '../src/util/get-next-fetch-block';

const atBlockNumber = (number: number): BlockStreamState => ({
  networkId: 1,
  blockHash: 'fake-hash',
  blockNumber: new BigNumber(number).valueOf(),
  timestamp: (new Date()).getTime(),
  rewindCount: 0
});

describe('getNextFetchBlock', () => {
  it('returns the current block if no state', () => {
    expect(getNextFetchBlock(null, 5, 0).toNumber()).to.equal(5);
  });

  it('returns the next block if the current block is ahead', () => {
    expect(getNextFetchBlock(atBlockNumber(1), 5, 0).toNumber()).to.equal(2);
  });

  it('returns the next block after reconciling the first block', () => {
    expect(getNextFetchBlock(atBlockNumber(5), 5, 0).toNumber()).to.equal(6);
  });

  it('returns the next block after advancing past the current block', () => {
    expect(getNextFetchBlock(atBlockNumber(10), 5, 0).toNumber()).to.equal(11);
  });

  it('correctly fetches the latest lookback if no state', () => {
    expect(getNextFetchBlock(null, 5, 3).toNumber()).to.equal(2);
  });

  it('correctly ignores lookback with state', () => {
    expect(getNextFetchBlock(atBlockNumber(10), 5, 3).toNumber()).to.equal(11);
  });
});
