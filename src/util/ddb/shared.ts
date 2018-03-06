import * as DynamoDB from 'aws-sdk/clients/dynamodb';

export const ddbClient = new DynamoDB.DocumentClient();
