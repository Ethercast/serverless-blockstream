import * as Joi from 'joi';

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

export interface Tuple extends Output {
  type: 'tuple',
  components: Output[]
}

interface ContractMember {
  constant?: boolean;
  inputs?: Input[];
  name?: string;
  outputs?: (Output | Tuple)[];
  type: string;
  payable?: boolean;
  stateMutability?: string;
  anonymous?: boolean;
}

export type Abi = ContractMember[];

export const JoiInput = Joi.object({
  name: Joi.string().allow(''),
  type: Joi.string(),
  indexed: Joi.boolean()
});

export const JoiOutput = Joi.object({
  name: Joi.string().allow(''),
  type: Joi.string()
});

export const JoiTuple = JoiOutput.keys({
  type: Joi.string().valid('tuple').required(),
  components: Joi.array().items(JoiOutput).min(1).required()
});

export const JoiContractMember = Joi.object({
  constant: Joi.boolean(),
  inputs: Joi.array().items(JoiInput),
  name: Joi.string().allow(''),
  outputs: Joi.array().items(
    Joi.alternatives(JoiOutput, JoiTuple)
  ),
  type: Joi.string(),
  payable: Joi.boolean(),
  stateMutability: Joi.string(),
  anonymous: Joi.boolean()
});

export const JoiAbi = Joi.array().items(JoiContractMember);