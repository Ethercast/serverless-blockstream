import * as fetch from 'isomorphic-fetch';
import { stringify } from 'querystring';
import { Abi, EtherscanResponse, JoiAbi } from './etherscan-model';
import { throttle } from '../util/throttle';

const BASE_GET_ABI_PARAMS = {
  module: 'contract',
  action: 'getabi'
};

export const getEtherscanAbi = throttle(
  200,
  async function (address: string, apiUrl: string, apiKey: string): Promise<Abi> {
    const response =
      await fetch(`${apiUrl}?${stringify({ ...BASE_GET_ABI_PARAMS, address, apikey: apiKey })}`);

    if (response.status !== 200) {
      throw new Error(`status code not 200 when getting ABI: ${response.status}`);
    }

    let text: string;
    try {
      text = await response.text();
    } catch (err) {
      throw new Error(`failed to get text in the response body: ${err.message}`);
    }

    let responseJson: EtherscanResponse;
    try {
      responseJson = JSON.parse(text);
    } catch (err) {
      throw new Error(`failed to parse json in response body: ${err.message}`);
    }

    // etherscan gives us 'NOTOK' and '0' if this fails
    if (responseJson.message !== 'OK') {
      throw new Error(`json message was not 'OK': ${responseJson.message}`);
    }

    if (responseJson.status !== '1') {
      throw new Error(`json status was not '1': ${responseJson.status}`);
    }

    let abi: Abi;
    try {
      abi = JSON.parse(responseJson.result);
    } catch (err) {
      throw new Error(`failed to parse the ABI json: ${err.message}`);
    }

    const { error, value } = JoiAbi.validate(abi);

    if (error && error.details && error.details.length) {
      throw new Error(`ABI received from etherscan did not match expected schema: ${JSON.stringify(error.details)}`);
    }

    return value;
  }
);