import { BlockStreamState } from '../src/util/model';
import toHex from '../src/util/to-hex';
import { expect } from 'chai';
import getNextFetchBlock from '../src/util/get-next-fetch-block';

const atBlockNumber = (number: number): BlockStreamState => ({
  network_id: 1,
  blockHash: 'fake-hash',
  blockNumber: toHex(number),
  timestamp: new Date()
});

describe('getNextFetchBlock', () => {
  it('returns the starting block if no state', () => {
    expect(getNextFetchBlock(null, 5).toNumber()).to.equal(5);
  });

  it('returns the starting block if last block is behind it', () => {
    expect(getNextFetchBlock(atBlockNumber(1), 5).toNumber()).to.equal(5);
  });

  it('returns the next block after reconciling the first block', () => {
    expect(getNextFetchBlock(atBlockNumber(5), 5).toNumber()).to.equal(6);
  });

  it('returns the next block after advancing past the starting block', () => {
    expect(getNextFetchBlock(atBlockNumber(10), 5).toNumber()).to.equal(11);
  });
});
