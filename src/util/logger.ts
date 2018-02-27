import * as bunyan from 'bunyan';
import { LOG_LEVEL } from './env';
import { BlockStreamState } from './model';
import _ = require('underscore');

function stateSerializer(state: BlockStreamState) {
  if (state && state.history && _.isArray(state.history)) {
    return {
      ..._.omit(state, 'history'),
      historyLength: state.history.length
    };
  }
  return state;
}

function metadataSerializer(metadata: { state: BlockStreamState }) {
  if (metadata && metadata.state) {
    return { ...metadata, state: stateSerializer(metadata.state) };
  }

  return metadata;
}

export default bunyan.createLogger({
  level: LOG_LEVEL,
  name: 'bunyan',
  serializers: {
    ...bunyan.stdSerializers,
    state: stateSerializer,
    metadata: metadataSerializer
  }
});