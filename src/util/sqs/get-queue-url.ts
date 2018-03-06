import logger from '../logger';
import * as SQS from 'aws-sdk/clients/sqs';

export const sqs = new SQS();

const QUEUE_URL_CACHE: { [queueName: string]: Promise<string> } = {};

const getQueueUrl: (QueueName: string) => Promise<string> =
  async function (QueueName: string) {
    if (QUEUE_URL_CACHE[QueueName]) {
      return QUEUE_URL_CACHE[QueueName];
    }

    return (
      QUEUE_URL_CACHE[QueueName] =
        sqs.getQueueUrl({ QueueName }).promise()
          .then(
            ({ QueueUrl }) => {
              if (!QueueUrl) {
                throw new Error('could not find queue url: ' + QueueName);
              }

              return QueueUrl;
            }
          )
          .catch(
            err => {
              logger.error({ err, QueueName }, 'failed to get queue');
              throw err;
            }
          )
    );
  };

export default getQueueUrl;