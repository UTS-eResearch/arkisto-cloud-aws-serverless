#! /bin/bash

CLUSTER_NAME=SeafoodSafety-arkistocluster4404FD7B-6hfI0bebqopR
SERVICE_NAME=SeafoodSafety-oniserviceService4ACCF1FB-JLJGkufBBOqY

aws ecs update-service --force-new-deployment --cluster ${CLUSTER_NAME} --service ${SERVICE_NAME}
