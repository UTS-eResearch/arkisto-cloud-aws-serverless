#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ArkistoCloudAwsStack } from '../lib/arkisto-cloud-aws-stack';

const app = new cdk.App();
const cloud_stack_id = app.node.tryGetContext("cloud_stack_id");
const base = app.node.tryGetContext("base");

if (cloud_stack_id) {
  new ArkistoCloudAwsStack(app, cloud_stack_id,{description: base["description"]});
} else {
  console.log("provide unique cloud formation stack id");
}
