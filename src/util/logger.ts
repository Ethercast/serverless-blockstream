import * as bunyan from 'bunyan';
import { LOG_LEVEL } from './env';
import _ = require('underscore');

export default bunyan.createLogger({
  level: LOG_LEVEL,
  name: 'bunyan',
  serializers: {
    ...bunyan.stdSerializers,
    state: function stateSerializer(state) {
      if (state && state.history && _.isArray(state.history)) {
        return {
          ..._.omit(state, 'history'),
          historyLength: state.history.length
        };
      }
      return state;
    }
  }
});