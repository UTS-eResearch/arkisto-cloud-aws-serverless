#!/bin/bash

cloud_stack_id=$(node -pe 'JSON.parse(process.argv[1]).context.cloud_stack_id' "$(cat cdk.json)")

CLOUD_FORMATION=$(aws cloudformation describe-stacks --stack-name ${cloud_stack_id}) && \

OUTPUTKEY=$1

node -pe "JSON.parse(process.argv[1]).Stacks[0].Outputs.find(x => x['OutputKey'] === '${OUTPUTKEY}')['OutputValue']" "${CLOUD_FORMATION}"
