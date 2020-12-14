#! /bin/bash

if [ $1 == 'stop' ]; then
  status=0
fi

if [ $1 == 'start' ]; then
  status=1
fi

if [ -z $1 ]; then
  echo 'please input command (start/stop)'
  exit -1
fi

if [ -z $3 ]; then
  echo 'please input service name'
  exit -1
fi

SERVICE_NAME=$3

aws ecs list-clusters > helpers/clusters.json

app=$(./node_modules/.bin/cdk list)
echo "BaseResources ID: ${app}"

clusterId=$(node bin/getResourceId.js ${app} cluster)
echo "Cluster ID: ${clusterId}"
if [ -z ${clusterId} ]; then
  echo "missing cluster id"
  exit -1
else
  aws ecs list-services --cluster ${clusterId} > helpers/services.json
  serviceId=$(node bin/getResourceId.js ${app} service ${app}-${SERVICE_NAME})
  echo "Service ID: ${serviceId}"
  #TODO: add  --force-new-deployment to command below
  echo aws ecs update-service --cluster ${clusterId} --service ${serviceId} --desired-count ${status}
  aws ecs update-service --cluster ${clusterId} --service ${serviceId} --desired-count ${status}
fi
