import * as bunyan from 'bunyan';
import { LOG_LEVEL } from './env';

export default bunyan.createLogger({
  level: LOG_LEVEL,
  name: 'bunyan',
  serializers: bunyan.stdSerializers
});