import { expect } from 'chai';
import 'mocha';
import { getEtherscanAbi } from '../src/etherscan/etherscan-client';

const API_URL = 'https://api.etherscan.io/api';
const API_KEY = '17CY9NYG5A77HWV1I8XP7U4IE9DB11KWT5';

describe('etherscan-client', () => {
  it('works for known address', async () => {
    const abi = await getEtherscanAbi('0x06012c8cf97bead5deae237070f9587f8e7a266d', API_URL, API_KEY);
    expect(abi).to.be.an('array');
  }).timeout(10000);

  it('fails for invalid address', async () => {
    const abi = await getEtherscanAbi('0x06012c8cf97bead5deae237070f9587f8e7a2660', API_URL, API_KEY);
    expect(abi).to.eq(null);
  });
});