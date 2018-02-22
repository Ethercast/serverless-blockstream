import * as bunyan from 'bunyan';

export default bunyan.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  name: 'bunyan',
  serializers: bunyan.stdSerializers
});