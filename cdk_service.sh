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

aws ecs list-clusters > helpers/clusters.json

baseresources=$(./node_modules/.bin/cdk list)
echo "BaseResources ID: ${baseresources}"

clusterId=$(node bin/getResourceId.js ${baseresources} cluster)
echo "Cluster ID: ${clusterId}"
if [ -z ${clusterId} ]; then
  echo "missing cluster id"
  exit -1
else
  aws ecs list-services --cluster ${clusterId} > helpers/services.json
  app=$(./node_modules/.bin/cdk list)
  serviceId=$(node bin/getResourceId.js ${app} service)
  echo "Service ID: ${serviceId}"
  #TODO: add  --force-new-deployment to command below
  echo aws ecs update-service --cluster ${clusterId} --service ${serviceId} --desired-count ${status}
  aws ecs update-service --cluster ${clusterId} --service ${serviceId} --desired-count ${status}
fi
