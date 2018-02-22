import * as bunyan from 'bunyan';

export default bunyan.createLogger({
  level: process.env.LEVEL || 'info',
  name: 'bunyan',
  serializers: bunyan.stdSerializers
});