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
  async function (address: string, apiUrl: string, apiKey: string): Promise<Abi | null> {
    const response =
      await fetch(`${apiUrl}?${stringify({ ...BASE_GET_ABI_PARAMS, address, apikey: apiKey })}`);

    if (response.status !== 200) {
      throw new Error(`status code not 200 when getting ABI for address ${address}: ${response.status}`);
    }

    let text: string;
    try {
      text = await response.text();
    } catch (err) {
      throw new Error(`failed to get text in the response body for address ${address}: ${err.message}`);
    }

    let responseJson: EtherscanResponse;
    try {
      responseJson = JSON.parse(text);
    } catch (err) {
      throw new Error(`failed to parse json in response body for address ${address}: ${err.message}`);
    }

    // etherscan gives us 'NOTOK' and '0' if the abi is not available. IF and ONLY IF this happens, we return null.
    // this indicates the user should not retry
    if (responseJson.message === 'NOTOK' && responseJson.status === '0' && responseJson.result === '') {
      return null;
    }

    let abi: Abi;
    try {
      abi = JSON.parse(responseJson.result);
    } catch (err) {
      throw new Error(`failed to parse the ABI json for address ${address}: ${err.message}`);
    }

    const { error, value } = JoiAbi.validate(abi);

    if (error && error.details && error.details.length) {
      throw new Error(`ABI received from etherscan did not match expected schema for address ${address}: ${JSON.stringify(error.details)}`);
    }

    return value;
  }
);