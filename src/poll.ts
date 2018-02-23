import logger from './util/logger';
import updateBlocks from './util/update-blocks';
import { Callback, Context, Handler } from 'aws-lambda';
import { NETWORK_ID, RUN_TIME_LENGTH_SECONDS, SRC_NODE_URL } from './util/env';
import getClient from './client/get-client';

const MILLISECONDS_RUNTIME: number = RUN_TIME_LENGTH_SECONDS * 1000;

export const start: Handler = async (event: any, context: Context, cb: Callback) => {
  const START_TIME = new Date().getTime();
  const runtime = () => (new Date().getTime()) - START_TIME;

  const client = await getClient(SRC_NODE_URL);

  const clientVersion = await client.web3_clientVersion();
  logger.info({ clientVersion }, 'ethereum node client version');

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

    if (runtime() >= MILLISECONDS_RUNTIME) {
      context.done();
      clearInterval(interval);
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
