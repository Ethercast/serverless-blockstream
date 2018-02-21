import WebSocket = require('ws');
import * as _ from 'underscore';
import Client, { Method } from './client';

const INFURA_API_KEY = '0eep3H3CSiqitPXv0aOy';

const NODE_URL = 'wss://mainnet.infura.io/ws';

const ws = new WebSocket(NODE_URL);

const START_TIME = (new Date()).getTime();

function runtime() {
  return (new Date()).getTime() - START_TIME;
}

const client = new Client({ ws });

const listenerLoop = _.throttle(
  function () {
    console.log(`looping for ${runtime()}ms`);

    client.cmd(Method.web3_clientVersion)
      .then(
        version => console.log(`client version: ${version}`)
      );

    listenerLoop();
  },
  1000
);

ws.on('open', () => {
  listenerLoop();

  // close the socket on exit
  process.on('exit', () => {
    ws.close();
  });
});
