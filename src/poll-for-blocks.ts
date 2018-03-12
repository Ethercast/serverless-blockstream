import logger from './util/logger';
import reconcileBlock from './util/reconcile-block';
import { Callback, Context, Handler } from 'aws-lambda';
import { NETWORK_ID, SRC_NODE_URL } from './util/env';
import getClient from './client/get-client';
import * as _ from 'underscore';
import ValidatedClient from './client/validated-eth-client';
import * as Lambda from 'aws-sdk/clients/lambda';
import * as SQS from 'aws-sdk/clients/sqs';
import * as SNS from 'aws-sdk/clients/sns';

const lambda = new Lambda();
const sqs = new SQS();
const sns = new SNS();

export const start: Handler = async (event: any, context: Context, cb: Callback) => {
  const unvalidatedClient = await getClient(logger, SRC_NODE_URL);
  // validate everything coming out of the ethereum node
  const client = new ValidatedClient(unvalidatedClient);

  const clientVersion = await client.web3_clientVersion();
  const netVersion = await client.net_version();

  // TODO: check against compatible client versions (not as important with the validated client)
  logger.info({ SRC_NODE_URL, netVersion, clientVersion }, 'ethereum node information');

  if (netVersion !== NETWORK_ID) {
    logger.fatal({ netVersion, NETWORK_ID }, 'NETWORK_ID and netVersion do not match');
    context.fail(new Error('invalid network ID'));
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
        logger.info('times up, ending loop');
        context.succeed('times up');
        return;
      }

      locked = true;

      reconcileBlock(lambda, sqs, client, sns)
        .then(
          (shouldHalt) => {
            if (shouldHalt) {
              logger.info('ending early due to halt signal received');
              context.succeed('received halt signal');
            } else {
              locked = false;
              _.defer(loop);
            }
          }
        )
        .catch(
          err => {
            logger.fatal({ err }, 'unexpected error encountered');

            context.fail(err);
          }
        );
    },
    1000
  );

  loop();
};
