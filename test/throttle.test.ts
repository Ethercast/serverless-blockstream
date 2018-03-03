import { throttle } from '../src/util/throttle';
import { expect } from 'chai';

describe('throttle', () => {
  let i = 0;

  async function increment(): Promise<number> {
    return ++i;
  }

  it('throttles the function', async () => {
    expect(i).to.eq(0);

    const THROTTLE_TIME = 300;

    const throttled = throttle(THROTTLE_TIME, increment);

    const time = Date.now();

    const num = await throttled();

    const after = Date.now();

    // take less than THROTTLE_TIME ms
    expect(after - time).to.be.lt(THROTTLE_TIME / 2);

    expect(i).to.eq(1);
    expect(num).to.eq(1);

    const now = Date.now();
    const again = await throttled();
    const then = Date.now();

    expect(i).to.eq(2);
    expect(again).to.eq(2);
    expect(then - now).to.be.gte(THROTTLE_TIME - 10);
  });
});
