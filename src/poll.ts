import logger from './util/logger';
import updateBlocks from './util/update-blocks';
import { Callback, Context, Handler } from 'aws-lambda';
import { NETWORK_ID, SRC_NODE_URL } from './util/env';
import getClient from './client/get-client';
import * as _ from 'underscore';

export const start: Handler = async (event: any, context: Context, cb: Callback) => {
  const client = await getClient(SRC_NODE_URL);

  const clientVersion = await client.web3_clientVersion();
  const netVersion = await client.net_version();
  // TODO: check against compatible client versions
  logger.info({ SRC_NODE_URL, netVersion, clientVersion }, 'ethereum node information');

  if (netVersion !== NETWORK_ID) {
    logger.error({ netVersion, NETWORK_ID }, 'NETWORK_ID and netVersion do not match');
    context.done(new Error('invalid network ID'));
    return;
  }

  let locked = false;

  const loop = _.throttle(
    () => {
      // only one iteration running at a time
      if (locked) {
        _.defer(loop);
        return;
      }

      // assume we cannot process a block in less than 3 seconds
      if (context.getRemainingTimeInMillis() < 3000) {
        context.done();
        return;
      }

      locked = true;

      updateBlocks(client)
        .then(
          () => {
            locked = false;
            _.defer(loop);
          }
        )
        .catch(
          err => {
            logger.error({ err }, 'unexpected error encountered');

            context.done(err);
          }
        );
    },
    1000
  );

  loop();
};
