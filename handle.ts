import { Callback, Context, Handler } from 'aws-lambda';

export const start: Handler = (event: any, context: Context, cb: Callback) => {
  console.log(event);
};
