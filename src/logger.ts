import * as bunyan from 'bunyan';

export default bunyan.createLogger({
  level: (process.env.LOG_LEVEL as any) || 'info',
  name: 'bunyan',
  serializers: bunyan.stdSerializers
});