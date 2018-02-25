import { NETWORK_ID, STARTING_BLOCK } from './env';
import { BlockWithTransactionHashes } from '../client/model';
import BigNumber from 'bignumber.js';
import { isBlockSaved } from './ddb/block-data';
import logger from './logger';
import { saveBlockStreamState } from './ddb/blockstream-state';
import { BlockStreamState } from './model';
import ValidatedEthClient from './validated-eth-client';

export default async function rewindBlocks(client: ValidatedEthClient, state: BlockStreamState, metadata: any) {
  logger.info({ metadata, state }, 'rewindBlocks: beginning rewind process');

  // the first block number we should check for existence in the ethereum node
  let checkingBlockNumber = new BigNumber(state.lastReconciledBlock.number);

  // iterate through parent blocks reported by the node until we get to one that exists
  while (true) {
    // in this case, all our block data is bad.. this should never happen
    if (checkingBlockNumber.lt(STARTING_BLOCK)) {
      logger.fatal(
        { checkingBlockNumber, metadata },
        'rewindBlocks: retraced and could not recover from a chain reorg!!! all our block data appears incorrect'
      );
      throw new Error('rewindBlocks: could not recover from chain reorg');
    }

    if (checkingBlockNumber.minus(state.lastReconciledBlock.number).abs().gt(50)) {
      logger.fatal(
        { checkingBlockNumber, metadata },
        'rewindBlocks: retraced back 50 blocks and could not find a block in dynamo'
      );
      throw new Error('rewindBlocks: failed to reconcile chain reorg within 50 blocks');
    }

    let block: BlockWithTransactionHashes;
    try {
      block = await client.eth_getBlockByNumber(checkingBlockNumber, false);
    } catch (err) {
      logger.error({
        checkingBlockNumber
      }, 'rewindBlocks: ethereum node returned null while checking for parent block numbers during a chain reorg!');
      throw new Error('rewindBlocks: missing block number from node during chain reorg');
    }

    const isSaved = await isBlockSaved(block.hash, block.number);

    // we have seen this block, so we can say it's the last one we reconciled
    if (isSaved) {
      logger.info({
        checkingBlockNumber,
        metadata,
        block: { hash: block.hash, number: block.number }
      }, 'rewindBlocks: chain org reconciled, block found in dynamo that exists on the node');

      await saveBlockStreamState(
        null,
        {
          lastReconciledBlock: {
            hash: block.hash,
            number: block.number
          },
          network_id: NETWORK_ID
        }
      );
      break;
    }

    checkingBlockNumber = checkingBlockNumber.minus(1);
  }

  return;
}