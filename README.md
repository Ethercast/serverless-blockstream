# serverless-blockstream
Polls a JSON RPC node for blocks and turns it into a stream of ordered transactions and logs in separate SQS queues

## Architecture

This project works by running a CloudWatch event scheduled lambda to connect to a Ethereum JSON RPC node, poll for new blocks, and store those blocks in dynamo, pushing notifications to SNS for new blocks

A lambda is triggered by SNS to drain the block queue, reading the new message from SQS and the block information from Dynamo. The block is parsed for transactions and logs and those transactions/logs are pushed into separate SQS queues. After a block is processed, a message is published to an SNS topic indicating that a block has been processed. A separate service drains the queues that are populated by this system.

This package also contains logic for decoding transactions and logs into a more usable format by querying Etherscan for ABIs.

## Unit Tests

The unit tests for this project are executed simply by running `npm test`

## TODO

- The drain block queue lambda can run out of memory parsing transactions and logs in a block due to bad parser code vended by web3. Rewrite code that takes an ABI and parses a log/transaction as separate module to remove dependency on web3
- Extract the JSON RPC client into its own module with unit tests
- Extract the Etherscan client into its own module with unit tests
- Remove references to a global logger from these modules
- Change dependency on Joi to something more user friendly, since Joi is too heavy

## There are secrets in package.json

Yes, I know. These are still valid secrets. But these APIs are free, so please do not abuse them using these secrets. If you wish to run your own service, replace them with your own secrets.
