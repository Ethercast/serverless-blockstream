import logger from '../logger';
import * as SQS from 'aws-sdk/clients/sqs';

const QUEUE_URL_CACHE: { [queueName: string]: Promise<string> } = {};

const getQueueUrl: (sqs: SQS, queueName: string) => Promise<string> =
  async function (sqs, queueName) {
    if (QUEUE_URL_CACHE[queueName]) {
      return QUEUE_URL_CACHE[queueName];
    }

    return (
      QUEUE_URL_CACHE[queueName] =
        sqs.getQueueUrl({ QueueName: queueName }).promise()
          .then(
            ({ QueueUrl }) => {
              if (!QueueUrl) {
                throw new Error('could not find queue url: ' + queueName);
              }

              return QueueUrl;
            }
          )
          .catch(
            err => {
              logger.error({ err, QueueName: queueName }, 'failed to get queue');
              throw err;
            }
          )
    );
  };

export default getQueueUrl;