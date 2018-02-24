import * as zlib from 'zlib';
import { BlockWithTransactionHashes, DecodedBlockPayload, Log } from './model';

export async function deflatePayload(block: BlockWithTransactionHashes, logs: Log[]): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    zlib.deflate(JSON.stringify({ block, logs }), (err, buffer) => {
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
