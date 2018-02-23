import BigNumber from 'bignumber.js';
import * as _ from 'underscore';
import toHex from '../util/to-hex';

export type MethodParameter = boolean | string | number | BigNumber | object;

export function serializeToMethodParameter(p: any): MethodParameter {
  switch (typeof p) {
    case 'object':
      if (p instanceof BigNumber) {
        return toHex(p);
      }

      if (Array.isArray(p)) {
        return _.map(p, serializeToMethodParameter);
      }

      return _.mapObject(p, serializeToMethodParameter);
    case 'string':
      return p;
    case 'number':
      return toHex(p);
    case 'boolean':
      return p;

    default:
      throw new Error('unhandled type');
  }
}
