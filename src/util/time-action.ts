import logger from './logger';

let actionId = 0;

export default async function timedAction(name: string, action: (...args: any[]) => any): Promise<void> {
  const time = new Date().getTime();
  const id = actionId++;

  logger.info({ id, time, name }, 'starting action');

  await action();

  logger.info({ id, name, totalTime: (new Date()).getTime() - time }, 'completed action');
}