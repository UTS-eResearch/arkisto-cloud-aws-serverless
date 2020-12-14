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

app=$(./node_modules/.bin/cdk list)
echo "BaseResources ID: ${app}"

declare -a clusters=($(node bin/getResourceId.js ${app} cluster))
for c in "${clusters[@]}"; do
  echo "Cluster ID: ${c}"
  if [ -z ${c} ]; then
    echo "missing cluster id"
    exit -1
  else
    cluster=${c%?}
    cluster=${cluster:1}
    echo ${cluster}
    aws ecs list-services --cluster ${cluster} > helpers/services.json
    declare -a services=($(node bin/getResourceId.js ${app} service))
    for s in "${services[@]}"; do
      echo "Service IDs: ${s}"
      service=${s%?}
      service=${service:1}
      echo ${service}
      #TODO: add  --force-new-deployment to command below
      echo aws ecs update-service --cluster ${cluster} --service ${service} --desired-count ${status}
      aws ecs update-service --cluster ${cluster} --service ${service} --desired-count ${status}
    done
  fi
done
