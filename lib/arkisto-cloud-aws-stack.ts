import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as efs from "@aws-cdk/aws-efs";
import * as ecs from "@aws-cdk/aws-ecs";
import * as logs from "@aws-cdk/aws-logs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import * as elb2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as cm from "@aws-cdk/aws-certificatemanager";

import DataIngest from "./dataingest";
import Oni from "./oni";

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
      volumes: [ocflVolumeConfig, configVolumeConfig, solrVolumeConfig],
      memoryLimitMiB: base["data_service"]["memory"],
      cpu: base["data_service"]["cpu"]
    }, {
      logging,
      base,
      ocflVolumeConfig,
      configVolumeConfig,
      solrVolumeConfig
    });

    const sshSecurityGroup = new ec2.SecurityGroup(this, 'ssh-security-group', {
      vpc: vpc,
      description: 'allow ssh access to ecs',
      allowAllOutbound: true
    });
    sshSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'allow ingress ssh traffic'
    );
    const sshApp = new ecs.FargateService(this, 'ssh-service', {
      cluster: cluster, // Required
      desiredCount: 1, // Default is 1
      taskDefinition: dataIngest,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4,
      assignPublicIp: true,
      securityGroups: [sshSecurityGroup]
    });
    const sshLb = new elb2.NetworkLoadBalancer(this, 'ssh-lb', {
      vpc: vpc,
      internetFacing: true
    });
    const listener = sshLb.addListener('ssh-listener', {
      port: 22,
      protocol: elb2.Protocol.TCP,
    });

    sshApp.registerLoadBalancerTargets({
      containerName: 'ssh',
      containerPort: 2222,
      newTargetGroupId: 'ecs',
      listener: ecs.ListenerConfig.networkListener(listener, {
        port: 22,
        protocol: elb2.Protocol.TCP
      }),
      protocol: ecs.Protocol.TCP
    });
    new cdk.CfnOutput(this, 'sshLoadBalancer', {value: sshLb.loadBalancerDnsName});

    sshApp.connections.allowFromAnyIpv4(ec2.Port.tcp(22), 'ssh-allow');
    sshApp.connections.allowFromAnyIpv4(ec2.Port.tcp(2222), 'ssh-docker-allow');
    sshApp.connections.allowFrom(sshSecurityGroup, ec2.Port.tcp(22));
    sshApp.connections.allowTo(sshSecurityGroup, ec2.Port.tcp(2222));
    sshApp.connections.allowFrom(ocflFileSystem, ec2.Port.tcp(2049));
    sshApp.connections.allowTo(ocflFileSystem, ec2.Port.tcp(2049));
    sshApp.connections.allowFrom(configFileSystem, ec2.Port.tcp(2049));
    sshApp.connections.allowTo(configFileSystem, ec2.Port.tcp(2049));
    sshApp.connections.allowFrom(solrFileSystem, ec2.Port.tcp(2049));
    sshApp.connections.allowTo(solrFileSystem, ec2.Port.tcp(2049));

    const oniTask = new Oni(this, 'oniTask', {
      volumes: [ocflVolumeConfig, configVolumeConfig, solrVolumeConfig],
      memoryLimitMiB: base["oni_task"]["memory"],
      cpu: base["oni_task"]["cpu"]
    }, {
      logging,
      base,
      ocflVolumeConfig,
      configVolumeConfig,
      solrVolumeConfig
    });

    const oniApp = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "oni-service", {
      cluster: cluster, // Required
      cpu: base["oni_service"]["cpu"], // Default is 256
      desiredCount: 1, // Default is 1
      memoryLimitMiB: base["oni_service"]["memory"], // Default is 512
      publicLoadBalancer: true, // Default is false
      taskDefinition: oniTask,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_4
    });

    if (base.certificate_arn) {
      var certArn = base.certificate_arn;
      const cert = cm.Certificate.fromCertificateArn(this, 'certificate-arn', certArn);

      const sslListener = oniApp.loadBalancer.addListener('ssl-listener', {
        port: 443,
        certificates: [cert],
        protocol: elb2.ApplicationProtocol.HTTPS
      });

      sslListener.addTargets('oni-target', {
        targets: [oniApp.service],
        port: 8080,
        protocol: elb2.ApplicationProtocol.HTTP,
        healthCheck: {
          path: '/config/status',
          interval: cdk.Duration.minutes(1)
        }
      });
    }
    oniApp.targetGroup.configureHealthCheck({
      path: "/",
      healthyHttpCodes: "200-399",
      interval: cdk.Duration.seconds(60),
      timeout: cdk.Duration.seconds(30),
      unhealthyThresholdCount: 5,
    });

    oniApp.service.connections.allowFrom(ocflFileSystem, ec2.Port.tcp(2049));
    oniApp.service.connections.allowTo(ocflFileSystem, ec2.Port.tcp(2049));
    oniApp.service.connections.allowFrom(configFileSystem, ec2.Port.tcp(2049));
    oniApp.service.connections.allowTo(configFileSystem, ec2.Port.tcp(2049));
    oniApp.service.connections.allowFrom(solrFileSystem, ec2.Port.tcp(2049));
    oniApp.service.connections.allowTo(solrFileSystem, ec2.Port.tcp(2049));

  }
}
