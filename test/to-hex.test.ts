import toHex from '../src/util/to-hex';
import { expect } from 'chai';
import BigNumber from 'bignumber.js';

describe('toHex', () => {
  it('works with numbers', () => {
    expect(toHex(0)).to.equal('0x0');
    expect(toHex(9)).to.equal('0x9');
    expect(toHex(15)).to.equal('0xf');
    expect(toHex(16)).to.equal('0x10');
  });

  it('works with strings that look like numbers', () => {
    expect(toHex('0')).to.equal('0x0');
    expect(toHex('9')).to.equal('0x9');
    expect(toHex('15')).to.equal('0xf');
    expect(toHex('16')).to.equal('0x10');
  });

  it('works with strings that look like hex', () => {
    expect(toHex('0x0')).to.equal('0x0');
    expect(toHex('0x9')).to.equal('0x9');
    expect(toHex('0xf')).to.equal('0xf');
    expect(toHex('0x10')).to.equal('0x10');
  });

  it('works with bignumbers', () => {
    expect(toHex(new BigNumber(0))).to.equal('0x0');
    expect(toHex(new BigNumber(9))).to.equal('0x9');
    expect(toHex(new BigNumber(15))).to.equal('0xf');
    expect(toHex(new BigNumber(16))).to.equal('0x10');
  });
});
