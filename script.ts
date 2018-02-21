import WebSocket = require('ws');
import Client from './client';

const { NODE_URL } = process.env;

const ws = new WebSocket(NODE_URL || 'wss://mainnet.infura.io/ws');

const START_TIME = (new Date()).getTime();

function runtime() {
  return (new Date()).getTime() - START_TIME;
}

const client = new Client({ ws });

ws.on('open', async () => {
  const clientVersion = await client.web3_clientVersion([]);
  console.log('client version', clientVersion);

  async function loop() {
    const blockNumber = await client.eth_blockNumber([]);
    console.log(`latest block number: ${blockNumber}`);

    const block = await client.eth_getBlockByNumber([blockNumber, false]);
    console.log(`fetched block`, block);
  }

  setInterval(() => {
    loop().catch(
      error => {
        console.error(`error encountered in loop after ${runtime()}ms:`, error);
      }
    );
  }, 1000);


  // close the socket on exit
  process.on('exit', () => {
    ws.close();
  });
});
