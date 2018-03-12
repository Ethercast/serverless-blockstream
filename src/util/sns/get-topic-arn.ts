import * as SNS from 'aws-sdk/clients/sns';

const CACHE: { [name: string]: Promise<string> } = {};

export default function getTopicArn(sns: SNS, topicName: string): Promise<string> {
  if (CACHE[ topicName ]) {
    return CACHE[ topicName ];
  }

  return (
    CACHE[ topicName ] =
      sns.createTopic({ Name: topicName }).promise()
        .then(
          ({ TopicArn }) => {
            if (!TopicArn) {
              throw new Error(`topic does not exist: ${topicName}`);
            }

            return TopicArn;
          }
        )
  );
}