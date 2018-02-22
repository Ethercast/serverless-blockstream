import BigNumber from 'bignumber.js';
import * as _ from 'underscore';

export type MethodParameter = boolean | string | number | BigNumber | object;


export function serializeParameter(p: any): any {
  switch (typeof p) {
    case 'object':
      if (p instanceof BigNumber) {
        return `0x${p.toString(16)}`;
      }

      if (Array.isArray(p)) {
        return _.map(p, serializeParameter);
      }

      return _.mapObject(p, serializeParameter);
    case 'string':
      return p;
    case 'number':
      return `0x${new BigNumber(p).toString(16)}`;
    case 'boolean':
      return p;
  }
}
