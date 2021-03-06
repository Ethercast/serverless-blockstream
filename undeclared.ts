declare module 'web3-eth-abi' {
  export interface ParameterDescription {
    type: string;
    name: string;
  }

  export interface EncodeArgument {
    name?: string;
    type: string;
    inputs?: ParameterDescription[];
  }

  function encodeFunctionSignature(signature: string | EncodeArgument): string;

  function encodeEventSignature(signature: string | EncodeArgument): string;

  function decodeLog(inputs: ParameterDescription[] | undefined, data: string, topics: string[]): any;

  function decodeParameters(inputs: ParameterDescription[], input: string): any;
}