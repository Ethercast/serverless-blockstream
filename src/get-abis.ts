import { JoiAddress } from '@ethercast/model';
import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import * as Joi from 'joi';
import * as _ from 'underscore';
import getAbi from './util/abi/get-abi';
import logger from './util/logger';

const JoiRequestFormat = Joi.object({
  addresses: Joi.array()
    .items(JoiAddress.lowercase())
    .min(1)
    .max(100)
    .unique((s1, s2) => s1.toLowerCase() === s2.toLowerCase())
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
    const { value, error } = JoiRequestFormat.validate(JSON.parse(body), { convert: true });

    if (error) {
      callback(null, {
        statusCode: 400,
        body: JSON.stringify({
          error: `Invalid request: ${error.details.map(({ message, path }) => `${path}: ${message}`).join('; ')}`
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

  const abisWithAddresses = await Promise.all(
    _.map(
      addresses,
      async address => {
        try {
          const abi = await getAbi(address);
          return { address, abi };
        } catch (err) {
          logger.warn({ err }, 'failed to get an abi');
          return { address, abi: null };
        }
      }
    )
  );

  const abis = _.chain(abisWithAddresses)
    .indexBy('address')
    .mapObject(({ address, abi }) => abi)
    .value();

  callback(null, { statusCode: 200, body: JSON.stringify({ abis }) });
};