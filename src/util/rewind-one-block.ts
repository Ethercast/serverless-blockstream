import BigNumber from 'bignumber.js';
import { BlockMetadata, getBlockMetadata } from './ddb/block-data';
import logger from './logger';
import { saveBlockStreamState } from './ddb/blockstream-state';
import { BlockStreamState } from './model';
import toHex from './to-hex';
import { notifyQueueOfBlock } from './sqs/sqs-util';

/**
 * This function is called to rewind blocks when the last reconciled block hash doesn't match the hash of the fetched block.
 *
 * We rewind by getting the last reconciled block out of dynamo, marking it removed, and updating our state.
 *
 * This call branch should continue to be called into until the last reconciled block matches the parent hash of the
 * next valid block.
 */
export default async function rewindOneBlock(state: BlockStreamState, metadata: any) {
  logger.info({ metadata, state }, 'rewindOneBlock: begin');

  // get the block metadata for the last saved block
  let blockMetadata: BlockMetadata;

  try {
    blockMetadata = await getBlockMetadata(state.blockNumber, state.blockHash);
  } catch (err) {
    logger.error({
      err,
      metadata,
      state
    }, 'rewindOneBlock: could not rewind since last state block was not found in dynamo');
    return;
  }

  try {
    // rewind to the parent hash
    await saveBlockStreamState(
      state,
      {
        hash: blockMetadata.parentHash,
        number: toHex(new BigNumber(blockMetadata.number).minus(1))
      }
    );
  } catch (err) {
    logger.fatal({
      err,
      metadata,
      state,
      blockMetadata
    }, 'rewindOneBlock: failed to save state with the parent block hash');
    return;
  }

  // TODO: this operation should be transactionally bound to the above operation, potentially with ddb streams
  try {
    await notifyQueueOfBlock(blockMetadata, true);
  } catch (err) {
    logger.fatal({
      err,
      metadata,
      state
    }, 'rewindOneBlock: failed to notify queue of removed block');
    return;
  }

  logger.info({ metadata, state }, 'rewindOneBlock: successfully rewound a block');
}