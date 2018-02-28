declare module 'web3-eth-abi' {

  function encodeEventSignature(signature: string): string;

  function decodeLog(inputs: { type: string; name: string; }[], data: string, topics: string[]): any;
}