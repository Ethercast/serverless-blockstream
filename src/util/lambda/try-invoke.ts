import { Lambda } from 'aws-sdk';

const ALREADY_RUNNING_ERROR = 'ReservedFunctionConcurrentInvocationLimitExceeded';

export default async function tryInvoke(lambda: Lambda, lambdaName: string) {
  try {
    const { StatusCode } = await lambda.invoke({
      InvocationType: 'DryRun',
      FunctionName: lambdaName
    }).promise();

    if (StatusCode === 204) {
      await lambda.invoke({
        InvocationType: 'Event',
        FunctionName: lambdaName
      }).promise();
    } else {
      throw new Error(`Lambda dry run invocation received unexpected status code: ${StatusCode}`);
    }
  } catch (err) {
    if (err.code === ALREADY_RUNNING_ERROR) {
      return;
    }

    throw err;
  }
}