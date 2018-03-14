import { expect } from 'chai';
import { getEtherscanAbi } from '../src/etherscan/etherscan-client';
import { Abi } from '../src/etherscan/etherscan-model';
import { decodeLogParameters, decodeTransactionParameters } from '../src/util/abi/decoder';
import { example1, LOG_ADDRESS_ABIS, TRANSACTION_TO_ABIS } from './data/decode-block-example-1.json';
import { KITTY_ABI, KITTY_OTHER_LOG, KITTY_TRANSFER_LOG } from './data/example-kitty-data';
import _ = require('underscore');

describe('decodeLogParameters', () => {
  _.each(
    example1.receipts,
    ({ logs }) => {
      _.each(
        logs,
        log => {
          const abi = LOG_ADDRESS_ABIS[ log.address ];
          if (abi) {
            it(`can decode log ${log.transactionHash}-${log.transactionIndex}`, () => {
              expect(decodeLogParameters(log, abi).ethercast).to.exist;
            });
          }
        }
      );
    }
  );

  it('has expected format', () => {
    const log = {
      'address': '0x151202c9c18e495656f372281f493eb7698961d5',
      'topics': [ '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', '0x000000000000000000000000aa167e9382e1e4df1992209cb585abf66b22e4a9', '0x0000000000000000000000007ece447cd793bed325f1378baa6892ba68b35a84' ],
      'data': '0x000000000000000000000000000000000000000000000024408e0e672c7d78c0',
      'blockNumber': '0x4fffb1',
      'transactionHash': '0x2417da22ffdc741a1e8496e01ce1d4d2152cf1130e5e08d70f04310b319c73d7',
      'transactionIndex': '0x3',
      'blockHash': '0x390c692bfc3793448aa78a993f59a0a67eb66fa56256079abda1d909c304bae4',
      'logIndex': '0x0',
      'removed': false
    };

    const abi = LOG_ADDRESS_ABIS[ log.address ];
    if (!abi) {
      throw new Error('not expected null');
    }

    expect(decodeLogParameters(log, abi).ethercast)
      .to.deep.eq({
      'eventName': 'Transfer',
      'parameters': {
        '0': '0xFC378dAA952ba7f163c4a11628f55a4df523b3EF',
        '1': '0xaa167e9382E1E4dF1992209cb585AbF66B22E4A9',
        '2': '668734457954955000000',
        '__length__': 3,
        '_from': '0xFC378dAA952ba7f163c4a11628f55a4df523b3EF',
        '_to': '0xaa167e9382E1E4dF1992209cb585AbF66B22E4A9',
        '_value': '668734457954955000000'
      }
    });
  });

  const ABI_ARRAY: string[] = [];

  it.skip('fetch abis', async () => {
    const ABIS: { [address: string]: Abi | null } = {};

    await Promise.all(
      _.map(
        ABI_ARRAY,
        async (address: string) => {
          try {
            ABIS[ address ] = await getEtherscanAbi(address, 'https://api.etherscan.io/api', process.env.ETHERSCAN_API_KEY);
          } catch (err) {
          }
        }
      )
    );

    console.log(JSON.stringify(ABIS));
  });
});

describe('decodeLogParameters', () => {
  it('works for kitty log', () => {
    expect(decodeLogParameters(KITTY_TRANSFER_LOG, KITTY_ABI).ethercast)
      .to.deep
      .eq({
        'eventName': 'Transfer',
        'parameters': {
          '0': '0xfC624f8F58dB41BDb95aedee1dE3c1cF047105f1',
          '1': '0xb1690C08E213a35Ed9bAb7B318DE14420FB57d8C',
          '2': '619611',
          '__length__': 3,
          'from': '0xfC624f8F58dB41BDb95aedee1dE3c1cF047105f1',
          'to': '0xb1690C08E213a35Ed9bAb7B318DE14420FB57d8C',
          'tokenId': '619611'
        }
      });
  });

  it('works for other kitty log', () => {
    console.log(JSON.stringify(decodeLogParameters(KITTY_OTHER_LOG, KITTY_ABI).ethercast));
    expect(decodeLogParameters(KITTY_OTHER_LOG, KITTY_ABI).ethercast)
      .to.deep
      .eq({
        'eventName': 'Pregnant',
        'parameters': {
          '0': '0x4EA5Ca0EB9552b00e130f51A7564F1B3D748DF74',
          '1': '594713',
          '2': '611508',
          '3': '5256075',
          '__length__': 4,
          'owner': '0x4EA5Ca0EB9552b00e130f51A7564F1B3D748DF74',
          'matronId': '594713',
          'sireId': '611508',
          'cooldownEndBlock': '5256075'
        }
      });
  });
});

describe('decodeTransactionParameters', () => {
  it('produces expected structure', () => {
    const abi = TRANSACTION_TO_ABIS[ '0x151202c9c18e495656f372281f493eb7698961d5' ];

    if (!abi) {
      throw new Error('missing abi');
    }

    expect(
      decodeTransactionParameters(
        {
          'blockHash': '0x390c692bfc3793448aa78a993f59a0a67eb66fa56256079abda1d909c304bae4',
          'blockNumber': '0x4fffb1',
          'from': '0xaa167e9382e1e4df1992209cb585abf66b22e4a9',
          'gas': '0x1d8a8',
          'gasPrice': '0x98bca5a00',
          'hash': '0x2417da22ffdc741a1e8496e01ce1d4d2152cf1130e5e08d70f04310b319c73d7',
          'input': '0xa9059cbb0000000000000000000000007ece447cd793bed325f1378baa6892ba68b35a84000000000000000000000000000000000000000000000024408e0e672c7d78c0',
          'nonce': '0xe1',
          'to': '0x151202c9c18e495656f372281f493eb7698961d5',
          'transactionIndex': '0x3',
          'value': '0x0',
          'v': '0x26',
          'r': '0x94886563f86a67779beeda995fd55125bd3fbd3d7f7442d4279f3b2ce74505be',
          's': '0x70c2622be4f4e3769a4e260f6ffd52e18c1d5ade4fa52737c4791a7ac6610ef'
        },
        abi
      ).ethercast
    ).to.deep.eq({
        'methodName': 'transfer',
        'parameters': {
          '0': '0x7eCE447cD793BED325f1378BaA6892bA68B35A84',
          '1': '668734457954955000000',
          '__length__': 2,
          '_to': '0x7eCE447cD793BED325f1378BaA6892bA68B35A84',
          '_value': '668734457954955000000'
        }
      }
    );
  });

  _.each(
    example1.block.transactions,
    transaction => {
      const { to } = transaction;
      const abi = to ? TRANSACTION_TO_ABIS[ to ] : null;
      if (to && abi) {
        it(`can decode transaction ${transaction.hash}`, () => {
          expect(decodeTransactionParameters(transaction, abi).ethercast).to.exist;
        });
      }
    }
  );
});