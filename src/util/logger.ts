import * as bunyan from 'bunyan';
import { LOG_LEVEL } from './env';
import _ = require('underscore');

function stateSerializer(state) {
  if (state && state.history && _.isArray(state.history)) {
    return {
      ..._.omit(state, 'history'),
      historyLength: state.history.length
    };
  }
  return state;
}

export default bunyan.createLogger({
  level: LOG_LEVEL,
  name: 'bunyan',
  serializers: {
    ...bunyan.stdSerializers,
    state: stateSerializer,
    metadata: function metadataSerializer(metadata) {
      if (metadata && metadata.state) {
        return { ...metadata, state: stateSerializer(metadata.state) };
      }

      return metadata;
    }
  }
});