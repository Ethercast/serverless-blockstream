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

export const JoiParameter = Joi.object({
  name: Joi.string().allow(''),
  type: Joi.string(),
  indexed: Joi.boolean()
});

export const JoiTuple = JoiParameter.keys({
  type: Joi.string().valid('tuple').required(),
  components: Joi.array().items(JoiParameter).min(1).required()
});

export const JoiContractMemberParameters = Joi.array()
  .items(Joi.alternatives(JoiParameter, JoiTuple));

export const JoiContractMember = Joi.object({
  constant: Joi.boolean(),
  inputs: JoiContractMemberParameters,
  name: Joi.string().allow(''),
  outputs: JoiContractMemberParameters,
  type: Joi.string(),
  payable: Joi.boolean(),
  stateMutability: Joi.string(),
  anonymous: Joi.boolean()
});

export const JoiAbi = Joi.array().items(JoiContractMember);