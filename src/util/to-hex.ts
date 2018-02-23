import BigNumber from 'bignumber.js';

export default function toHex(number: string | number | BigNumber): string {
  if (typeof number === 'string' && number.indexOf('0x') === 0) {
    return number;
  } else if (typeof number === 'number') {
    return `0x${number.toString(16)}`;
  } else if (typeof number === 'string' && /^[0-9]+$/.test(number)) {
    return `0x${parseInt(number).toString(16)}`;
  } else if (number instanceof BigNumber) {
    return `0x${number.toString(16)}`;
  } else {
    throw new Error(`did not understand number type: ${number}`);
  }
}
