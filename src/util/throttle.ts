async function sleep(ms: number) {
  return new Promise((resolve) => {
    if (ms > 0) {
      setTimeout(() => resolve(), ms);
    } else {
      resolve();
    }
  });
}

async function sleepUntil(epochTimeMs: number) {
  await sleep(epochTimeMs - Date.now());
}

export function throttle<T>(ms: number, func: (...args: any[]) => Promise<T>) {
  let nextCallTimeMs: number = Date.now();

  return async function throttled(...args: any[]): Promise<T> {
    const time = nextCallTimeMs;
    nextCallTimeMs = Date.now() + ms;
    await sleepUntil(time);

    return func(...args);
  };
}