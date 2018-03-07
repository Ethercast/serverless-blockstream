import * as zlib from 'zlib';
import { DecodedBlockPayload } from './model';
import { BlockWithFullTransactions, TransactionReceipt } from '@ethercast/model';

export async function deflatePayload(block: BlockWithFullTransactions,
                                     receipts: TransactionReceipt[]): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const payload: DecodedBlockPayload = {
      block,
      receipts
    };

    zlib.deflate(JSON.stringify(payload), (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer);
      }
    });
  });
}

export async function inflatePayload(payload: Buffer): Promise<DecodedBlockPayload> {
  return new Promise<DecodedBlockPayload>((resolve, reject) => {
    zlib.inflate((payload), (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(buffer.toString('utf-8')));
      }
    });
  });
}
