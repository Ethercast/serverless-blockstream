import { JoiAddress } from '@ethercast/model';
import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import * as Joi from 'joi';
import * as _ from 'underscore';
import { Abi } from './etherscan/etherscan-model';
import getAbi from './util/abi/get-abi';
import logger from './util/logger';

const JoiRequestFormat = Joi.object({
  addresses: Joi.array()
    .items(JoiAddress)
    .min(1)
    .max(100)
    .required()
});

interface Request {
  addresses: string[];
}

export const handle: Handler = async (event: APIGatewayEvent, context: Context, callback?: Callback) => {
  if (!callback) {
    throw new Error('missing callback');
  }

  const { body } = event;

  if (body === null) {
    callback(null, { statusCode: 400, body: JSON.stringify({ error: 'Missing request body' }) });
    return;
  }

  let request: Request;
  try {
    const { value, error } = JoiRequestFormat.validate(JSON.parse(body));

    if (error) {
      callback(null, {
        statusCode: 400,
        body: JSON.stringify({
          error: `Invalid request: ${error.details.map(({ message }) => message).join('; ')}`
        })
      });
    }

    request = value;
  } catch (err) {
    logger.error({ err }, 'failed to parse request');
    callback(new Error('failed to parse request'));
    return;
  }


  const { addresses } = request;

  const abis: { [address: string]: Abi | null } = {};

  _.each(
    addresses,
    async address => {
      try {
        abis[ address ] = await getAbi(address);
      } catch (err) {
        logger.warn({ err }, 'failed to get an abi');
        abis[ address ] = null;
      }
    }
  );

  callback(null, { statusCode: 200, body: JSON.stringify({ abis }) });
};