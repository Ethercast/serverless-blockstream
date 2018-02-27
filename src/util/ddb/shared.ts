import { DynamoDB } from 'aws-sdk';

export const ddbClient = new DynamoDB.DocumentClient();
