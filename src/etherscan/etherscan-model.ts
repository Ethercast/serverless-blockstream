import { array, boolean, object, string } from 'joi';

export interface EtherscanResponse {
  message: 'NOTOK' | 'OK';
  result: string;
  status: '1' | '0';
}

export interface Input {
  name: string;
  type: string;
  indexed?: boolean;
}

export interface Output {
  name: string;
  type: string;
}

interface ContractMember {
  constant?: boolean;
  inputs: Input[];
  name: string;
  outputs: Output[];
  type: string;
  payable?: boolean;
  stateMutability?: string;
  anonymous?: boolean;
}

export type Abi = ContractMember[];

export const JoiInput = object({
  name: string().required().allow(''),
  type: string().required(),
  indexed: boolean()
});

export const JoiOutput = object({
  name: string().required().allow(''),
  type: string().required()
});

export const JoiContractMember = object({
  constant: boolean(),
  inputs: array().items(JoiInput).required(),
  name: string().required().allow(''),
  outputs: array().items(JoiOutput).required(),
  type: string().required(),
  payable: boolean(),
  stateMutability: string(),
  anonymous: boolean()
});

export const JoiAbi = array().items(JoiContractMember);