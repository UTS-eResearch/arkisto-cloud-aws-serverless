#!/bin/bash

cloud_stack_id=$(node -pe 'JSON.parse(process.argv[1]).context.cloud_stack_id' "$(cat cdk.json)")

CLOUD_FORMATION=$(aws cloudformation describe-stacks --stack-name ${cloud_stack_id}) && \

#node -pe 'JSON.parse(process.argv[1]).Stacks.Outputs' "${CLOUD_FORMATION}"

echo Seafo-datas-TIFUCQNGDYMD-1399301310.ap-southeast-2.elb.amazonaws.com
