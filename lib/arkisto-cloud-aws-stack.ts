import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as efs from "@aws-cdk/aws-efs";
import * as ecs from "@aws-cdk/aws-ecs";
import * as logs from "@aws-cdk/aws-logs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import * as elb2 from "@aws-cdk/aws-elasticloadbalancingv2";

import Express from "./express";
import DataIngest from "./dataingest";

export class ArkistoCloudAwsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const base = scope.node.tryGetContext("base");
    const vpc = new ec2.Vpc(this, "arkisto-vpc", {
      maxAzs: 3 // Default is all AZs in region
    });

    const ocflFileSystem = new efs.FileSystem(this, "ocfl-fs", {
      vpc,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
    });
    new cdk.CfnOutput(this, 'ocflFileSystemId', {value: ocflFileSystem.fileSystemId});

    const ocflVolumeConfig = {
      name: "ocfl-vol",
      efsVolumeConfiguration: {
        fileSystemId: ocflFileSystem.fileSystemId,
      }
    };

    const solrFileSystem = new efs.FileSystem(this, "solr-fs", {
      vpc,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING
    });

    const solrVolumeConfig = {
      name: "solr-vol",
      efsVolumeConfiguration: {
        fileSystemId: solrFileSystem.fileSystemId,
      },
      permissions: []
    };

    const configFileSystem = new efs.FileSystem(this, "config-fs", {
      vpc,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING
    });
    new cdk.CfnOutput(this, 'configFileSystemId', {value: configFileSystem.fileSystemId});

    const configVolumeConfig = {
      name: "config-vol",
      efsVolumeConfiguration: {
        fileSystemId: configFileSystem.fileSystemId,
      }
    };

    const cluster = new ecs.Cluster(this, "arkisto-cluster", {
      vpc: vpc
    });

    const logging = new ecs.AwsLogDriver({streamPrefix: "oni", logRetention: logs.RetentionDays.ONE_MONTH})

    const dataIngest = new DataIngest(this, "data-ingest-task-definition", {
      volumes: [ocflVolumeConfig, configVolumeConfig],
      memoryLimitMiB: base["data_service"]["memory"],
      cpu: base["data_service"]["cpu"]
    }, {
      logging,
      base,
      ocflVolumeConfig,
      configVolumeConfig
    });

    const availabilityZones = this.node.tryGetContext('availability_zones');
    const dataApp = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'data-service', {
      cluster: cluster, // Required
      cpu: base["load_balancer"]["cpu"], // Default is 256
      desiredCount: 1, // Default is 1
      memoryLimitMiB: base["load_balancer"]["memory"], // Default is 512
      publicLoadBalancer: true, // Default is false
      taskDefinition: dataIngest,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
      listenerPort: 22
    });
    dataApp.service.connections.allowFrom(ocflFileSystem, ec2.Port.tcp(2049));
    dataApp.service.connections.allowTo(ocflFileSystem, ec2.Port.tcp(2049));
    dataApp.service.connections.allowFrom(configFileSystem, ec2.Port.tcp(2049));
    dataApp.service.connections.allowTo(configFileSystem, ec2.Port.tcp(2049));

    // const indexer = new Indexer(this, 'indexer', {
    //   volumes: [ocflVolumeConfig, configVolumeConfig],
    //   memoryLimitMiB: base["indexer"]["memory"],
    //   cpu: base["indexer"]["cpu"],
    // }, {
    //   logging,
    //   base,
    //   ocflVolumeConfig,
    //   configVolumeConfig
    // });

    const express = new Express(this, 'oni', {
      volumes: [ocflVolumeConfig, solrVolumeConfig, configVolumeConfig],
      memoryLimitMiB: base["service"]["memory"],
      cpu: base["service"]["cpu"]
    }, {
      logging,
      base,
      solrVolumeConfig,
      ocflVolumeConfig,
      configVolumeConfig
    });

    // Create a load-balanced Fargate service and make it public
    const app = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "oni-express-fargate-service", {
      cluster: cluster, // Required
      cpu: base["load_balancer"]["cpu"], // Default is 256
      desiredCount: 1, // Default is 1
      memoryLimitMiB: base["load_balancer"]["memory"], // Default is 512
      publicLoadBalancer: true, // Default is false
      taskDefinition: express,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4
    });

    app.targetGroup.configureHealthCheck({
      path: "/",
      healthyHttpCodes: "200-399",
      interval: cdk.Duration.seconds(60),
      timeout: cdk.Duration.seconds(30),
      unhealthyThresholdCount: 5
    });

    app.service.connections.allowFrom(ocflFileSystem, ec2.Port.tcp(2049));
    app.service.connections.allowTo(ocflFileSystem, ec2.Port.tcp(2049));
    app.service.connections.allowFrom(solrFileSystem, ec2.Port.tcp(2049));
    app.service.connections.allowTo(solrFileSystem, ec2.Port.tcp(2049));
    app.service.connections.allowFrom(configFileSystem, ec2.Port.tcp(2049));
    app.service.connections.allowTo(configFileSystem, ec2.Port.tcp(2049));

  }
}
