import logger from './util/logger';
import updateBlocks from './util/update-blocks';
import { Callback, Context, Handler } from 'aws-lambda';
import { NETWORK_ID, SRC_NODE_URL } from './util/env';
import getClient from './client/get-client';

export const start: Handler = async (event: any, context: Context, cb: Callback) => {
  const client = await getClient(SRC_NODE_URL);

  const clientVersion = await client.web3_clientVersion();
  logger.info({ clientVersion }, 'ethereum node client version');

  // TODO: check against compatible client versions

  const netVersion = await client.net_version();
  logger.info({ netVersion }, 'ethereum network id');

  if (netVersion !== NETWORK_ID) {
    logger.error({ netVersion, NETWORK_ID }, 'NETWORK_ID and netVersion do not match');
    context.done(new Error('invalid network ID'));
    return;
  }

  let locked = false;

  const interval = setInterval(() => {
    // only one iteration running at a time
    if (locked) {
      return;
    }

    // assume we cannot process a block in less than 5 seconds
    if (context.getRemainingTimeInMillis() < 5000) {
      clearInterval(interval);
      context.done();
      return;
    }

    locked = true;

    updateBlocks(client)
      .then(
        () => {
          locked = false;
        }
      )
      .catch(
        err => {
          logger.error({ err }, 'unexpected error encountered');

          context.done(err);
        }
      );
  }, 100);
};
