import BigNumber from 'bignumber.js';
import * as _ from 'underscore';

export type MethodParameter = boolean | string | number | BigNumber | object;

export function serializeToMethodParameter(p: any): MethodParameter {
  switch (typeof p) {
    case 'object':
      if (p instanceof BigNumber) {
        return `0x${p.toString(16)}`;
      }

      if (Array.isArray(p)) {
        return _.map(p, serializeToMethodParameter);
      }

      return _.mapObject(p, serializeToMethodParameter);
    case 'string':
      return p;
    case 'number':
      return `0x${new BigNumber(p).toString(16)}`;
    case 'boolean':
      return p;

    default:
      throw new Error('unhandled type');
  }
}
