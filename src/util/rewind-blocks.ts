import { NETWORK_ID } from './env';
import { BlockWithTransactionHashes } from '../client/model';
import BigNumber from 'bignumber.js';
import { isBlockSaved } from './ddb/block-data';
import logger from './logger';
import { saveBlockStreamState } from './ddb/blockstream-state';
import { BlockStreamState } from './model';
import ValidatedEthClient from './validated-eth-client';

/**
 * This function is called to rewind blocks when the last reconciled block
 */
export default async function rewindBlocks(client: ValidatedEthClient, state: BlockStreamState, metadata: any) {
  logger.info({ metadata, state }, 'rewindBlocks: beginning rewind process');

  // the first block number we should check for existence in the ethereum node
  let checkingBlockNumber = new BigNumber(state.blockNumber);

  // iterate through parent blocks reported by the node until we get to one that exists
  while (true) {
    if (checkingBlockNumber.minus(state.blockNumber).abs().gt(25)) {
      logger.fatal(
        { checkingBlockNumber, metadata },
        'rewindBlocks: retraced blocks and could not find a block in dynamo'
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
          network_id: NETWORK_ID,
          blockHash: block.hash,
          blockNumber: block.number,
          timestamp: new Date()
        }
      );
      break;
    }

    checkingBlockNumber = checkingBlockNumber.minus(1);
  }

  return;
}