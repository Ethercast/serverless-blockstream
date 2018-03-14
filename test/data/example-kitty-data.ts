import { Log } from '@ethercast/model';
import { Abi } from '../../src/etherscan/etherscan-model';

export const KITTY_ABI: Abi = [ {
  'constant': true,
  'inputs': [ { 'name': '_interfaceID', 'type': 'bytes4' } ],
  'name': 'supportsInterface',
  'outputs': [ { 'name': '', 'type': 'bool' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'cfoAddress',
  'outputs': [ { 'name': '', 'type': 'address' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [ { 'name': '_tokenId', 'type': 'uint256' }, { 'name': '_preferredTransport', 'type': 'string' } ],
  'name': 'tokenMetadata',
  'outputs': [ { 'name': 'infoUrl', 'type': 'string' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'promoCreatedCount',
  'outputs': [ { 'name': '', 'type': 'uint256' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'name',
  'outputs': [ { 'name': '', 'type': 'string' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_to', 'type': 'address' }, { 'name': '_tokenId', 'type': 'uint256' } ],
  'name': 'approve',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'ceoAddress',
  'outputs': [ { 'name': '', 'type': 'address' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'GEN0_STARTING_PRICE',
  'outputs': [ { 'name': '', 'type': 'uint256' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_address', 'type': 'address' } ],
  'name': 'setSiringAuctionAddress',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'totalSupply',
  'outputs': [ { 'name': '', 'type': 'uint256' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'pregnantKitties',
  'outputs': [ { 'name': '', 'type': 'uint256' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [ { 'name': '_kittyId', 'type': 'uint256' } ],
  'name': 'isPregnant',
  'outputs': [ { 'name': '', 'type': 'bool' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'GEN0_AUCTION_DURATION',
  'outputs': [ { 'name': '', 'type': 'uint256' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'siringAuction',
  'outputs': [ { 'name': '', 'type': 'address' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_from', 'type': 'address' }, { 'name': '_to', 'type': 'address' }, {
    'name': '_tokenId',
    'type': 'uint256'
  } ],
  'name': 'transferFrom',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_address', 'type': 'address' } ],
  'name': 'setGeneScienceAddress',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_newCEO', 'type': 'address' } ],
  'name': 'setCEO',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_newCOO', 'type': 'address' } ],
  'name': 'setCOO',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_kittyId', 'type': 'uint256' }, {
    'name': '_startingPrice',
    'type': 'uint256'
  }, { 'name': '_endingPrice', 'type': 'uint256' }, { 'name': '_duration', 'type': 'uint256' } ],
  'name': 'createSaleAuction',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [],
  'name': 'unpause',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [ { 'name': '', 'type': 'uint256' } ],
  'name': 'sireAllowedToAddress',
  'outputs': [ { 'name': '', 'type': 'address' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [ { 'name': '_matronId', 'type': 'uint256' }, { 'name': '_sireId', 'type': 'uint256' } ],
  'name': 'canBreedWith',
  'outputs': [ { 'name': '', 'type': 'bool' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [ { 'name': '', 'type': 'uint256' } ],
  'name': 'kittyIndexToApproved',
  'outputs': [ { 'name': '', 'type': 'address' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_kittyId', 'type': 'uint256' }, {
    'name': '_startingPrice',
    'type': 'uint256'
  }, { 'name': '_endingPrice', 'type': 'uint256' }, { 'name': '_duration', 'type': 'uint256' } ],
  'name': 'createSiringAuction',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': 'val', 'type': 'uint256' } ],
  'name': 'setAutoBirthFee',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_addr', 'type': 'address' }, { 'name': '_sireId', 'type': 'uint256' } ],
  'name': 'approveSiring',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_newCFO', 'type': 'address' } ],
  'name': 'setCFO',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_genes', 'type': 'uint256' }, { 'name': '_owner', 'type': 'address' } ],
  'name': 'createPromoKitty',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': 'secs', 'type': 'uint256' } ],
  'name': 'setSecondsPerBlock',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'paused',
  'outputs': [ { 'name': '', 'type': 'bool' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [],
  'name': 'withdrawBalance',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [ { 'name': '_tokenId', 'type': 'uint256' } ],
  'name': 'ownerOf',
  'outputs': [ { 'name': 'owner', 'type': 'address' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'GEN0_CREATION_LIMIT',
  'outputs': [ { 'name': '', 'type': 'uint256' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'newContractAddress',
  'outputs': [ { 'name': '', 'type': 'address' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_address', 'type': 'address' } ],
  'name': 'setSaleAuctionAddress',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [ { 'name': '_owner', 'type': 'address' } ],
  'name': 'balanceOf',
  'outputs': [ { 'name': 'count', 'type': 'uint256' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_v2Address', 'type': 'address' } ],
  'name': 'setNewAddress',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'secondsPerBlock',
  'outputs': [ { 'name': '', 'type': 'uint256' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [],
  'name': 'pause',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [ { 'name': '_owner', 'type': 'address' } ],
  'name': 'tokensOfOwner',
  'outputs': [ { 'name': 'ownerTokens', 'type': 'uint256[]' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_matronId', 'type': 'uint256' } ],
  'name': 'giveBirth',
  'outputs': [ { 'name': '', 'type': 'uint256' } ],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [],
  'name': 'withdrawAuctionBalances',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'symbol',
  'outputs': [ { 'name': '', 'type': 'string' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [ { 'name': '', 'type': 'uint256' } ],
  'name': 'cooldowns',
  'outputs': [ { 'name': '', 'type': 'uint32' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [ { 'name': '', 'type': 'uint256' } ],
  'name': 'kittyIndexToOwner',
  'outputs': [ { 'name': '', 'type': 'address' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_to', 'type': 'address' }, { 'name': '_tokenId', 'type': 'uint256' } ],
  'name': 'transfer',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'cooAddress',
  'outputs': [ { 'name': '', 'type': 'address' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'autoBirthFee',
  'outputs': [ { 'name': '', 'type': 'uint256' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'erc721Metadata',
  'outputs': [ { 'name': '', 'type': 'address' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_genes', 'type': 'uint256' } ],
  'name': 'createGen0Auction',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [ { 'name': '_kittyId', 'type': 'uint256' } ],
  'name': 'isReadyToBreed',
  'outputs': [ { 'name': '', 'type': 'bool' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'PROMO_CREATION_LIMIT',
  'outputs': [ { 'name': '', 'type': 'uint256' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_contractAddress', 'type': 'address' } ],
  'name': 'setMetadataAddress',
  'outputs': [],
  'payable': false,
  'stateMutability': 'nonpayable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'saleAuction',
  'outputs': [ { 'name': '', 'type': 'address' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [ { 'name': '_id', 'type': 'uint256' } ],
  'name': 'getKitty',
  'outputs': [ { 'name': 'isGestating', 'type': 'bool' }, {
    'name': 'isReady',
    'type': 'bool'
  }, { 'name': 'cooldownIndex', 'type': 'uint256' }, {
    'name': 'nextActionAt',
    'type': 'uint256'
  }, { 'name': 'siringWithId', 'type': 'uint256' }, { 'name': 'birthTime', 'type': 'uint256' }, {
    'name': 'matronId',
    'type': 'uint256'
  }, { 'name': 'sireId', 'type': 'uint256' }, { 'name': 'generation', 'type': 'uint256' }, {
    'name': 'genes',
    'type': 'uint256'
  } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_sireId', 'type': 'uint256' }, { 'name': '_matronId', 'type': 'uint256' } ],
  'name': 'bidOnSiringAuction',
  'outputs': [],
  'payable': true,
  'stateMutability': 'payable',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'gen0CreatedCount',
  'outputs': [ { 'name': '', 'type': 'uint256' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': true,
  'inputs': [],
  'name': 'geneScience',
  'outputs': [ { 'name': '', 'type': 'address' } ],
  'payable': false,
  'stateMutability': 'view',
  'type': 'function'
}, {
  'constant': false,
  'inputs': [ { 'name': '_matronId', 'type': 'uint256' }, { 'name': '_sireId', 'type': 'uint256' } ],
  'name': 'breedWithAuto',
  'outputs': [],
  'payable': true,
  'stateMutability': 'payable',
  'type': 'function'
}, { 'inputs': [], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'constructor' }, {
  'payable': true,
  'stateMutability': 'payable',
  'type': 'fallback'
}, {
  'anonymous': false,
  'inputs': [ { 'indexed': false, 'name': 'owner', 'type': 'address' }, {
    'indexed': false,
    'name': 'matronId',
    'type': 'uint256'
  }, { 'indexed': false, 'name': 'sireId', 'type': 'uint256' }, {
    'indexed': false,
    'name': 'cooldownEndBlock',
    'type': 'uint256'
  } ],
  'name': 'Pregnant',
  'type': 'event'
}, {
  'anonymous': false,
  'inputs': [ { 'indexed': false, 'name': 'from', 'type': 'address' }, {
    'indexed': false,
    'name': 'to',
    'type': 'address'
  }, { 'indexed': false, 'name': 'tokenId', 'type': 'uint256' } ],
  'name': 'Transfer',
  'type': 'event'
}, {
  'anonymous': false,
  'inputs': [ { 'indexed': false, 'name': 'owner', 'type': 'address' }, {
    'indexed': false,
    'name': 'approved',
    'type': 'address'
  }, { 'indexed': false, 'name': 'tokenId', 'type': 'uint256' } ],
  'name': 'Approval',
  'type': 'event'
}, {
  'anonymous': false,
  'inputs': [ { 'indexed': false, 'name': 'owner', 'type': 'address' }, {
    'indexed': false,
    'name': 'kittyId',
    'type': 'uint256'
  }, { 'indexed': false, 'name': 'matronId', 'type': 'uint256' }, {
    'indexed': false,
    'name': 'sireId',
    'type': 'uint256'
  }, { 'indexed': false, 'name': 'genes', 'type': 'uint256' } ],
  'name': 'Birth',
  'type': 'event'
}, {
  'anonymous': false,
  'inputs': [ { 'indexed': false, 'name': 'newContract', 'type': 'address' } ],
  'name': 'ContractUpgrade',
  'type': 'event'
} ];

export const KITTY_TRANSFER_LOG: Log = {
  'address': '0x06012c8cf97bead5deae237070f9587f8e7a266d',
  'topics': [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  ],
  'data': '0x000000000000000000000000fc624f8f58db41bdb95aedee1de3c1cf047105f1000000000000000000000000b1690c08e213a35ed9bab7b318de14420fb57d8c000000000000000000000000000000000000000000000000000000000009745b',
  'blockNumber': '0x502481',
  'transactionHash': '0xe74e585487462222c811f69900f90976e00e11b36adceafde61222f78ceb7b53',
  'transactionIndex': '0x13',
  'blockHash': '0xc4b6ac367ebe2f0b3eb64385899b8a264395ed4323032242819115e1e954d09a',
  'logIndex': '0x5',
  'removed': false
};


export const KITTY_OTHER_LOG: Log = {
  'address': '0x06012c8cf97bead5deae237070f9587f8e7a266d',
  'topics': [
    '0x241ea03ca20251805084d27d4440371c34a0b85ff108f6bb5611248f73818b80'
  ],
  'data': '0x0000000000000000000000004ea5ca0eb9552b00e130f51a7564f1b3d748df74000000000000000000000000000000000000000000000000000000000009131900000000000000000000000000000000000000000000000000000000000954b4000000000000000000000000000000000000000000000000000000000050338b',
  'blockNumber': '0x50248b',
  'transactionHash': '0x62ea1d7ca40dce0121ca37316bc27c0e4ace4a9c70c36e43493fed325bf0dadb',
  'transactionIndex': '0x2d',
  'blockHash': '0xe8d086e9eaec4af921efe93fdeefc58b8c0be00ba359aeb3a3af0c00ec93dc57',
  'logIndex': '0x1b',
  'removed': false
};
