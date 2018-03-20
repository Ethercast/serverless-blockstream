import { expect } from 'chai';
import 'mocha';
import { JoiAbi } from '../src/etherscan/etherscan-model';
import { ETHBOT_ABI } from './data/example-abis';

describe('etherscan-model', () => {
  it('works for ETHBOTS abi', () => {
    expect(JoiAbi.validate(ETHBOT_ABI).error).to.be.null;
  });
});