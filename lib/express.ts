import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as path from 'path';
import * as fs from 'fs';
import * as logs from "@aws-cdk/aws-logs";

export default class Express extends ecs.FargateTaskDefinition {
  oniExpress: any;
  solr: any;
  memcached: any;
  ssh: any;

  constructor(scope: cdk.Construct, id: string, props: ecs.FargateTaskDefinitionProps, config: any) {
    super(scope, id, props);
    const base = config.base;

    const logging = new ecs.AwsLogDriver({streamPrefix: "oni", logRetention: logs.RetentionDays.ONE_MONTH})

    let sshPublicKey = fs.readFileSync(base.ssh.public_key, 'utf8');
    sshPublicKey = sshPublicKey.replace(/\r?\n|\r/g, " ");
    this.ssh = this.addContainer('ssh', {
      image: ecs.ContainerImage.fromRegistry('ghcr.io/linuxserver/openssh-server'),
      memoryLimitMiB: base.ssh.memory, // Default is 512
      essential: true,
      environment: {
        PUBLIC_KEY: sshPublicKey,
        SUDO_ACCESS: 'true',
        USER_NAME: 'arkisto'
      },
      healthCheck: {
        command: [
          "CMD-SHELL",
          "curl -f http://localhost:8080/ || exit 1"
        ],
        retries: 10,
        timeout: cdk.Duration.seconds(60)
      },
      logging: logging
    });
    this.ssh.addPortMappings({
      containerPort: 2222,
      hostPort: 2222,
      protocol: ecs.Protocol.TCP
    });

    this.ssh.addMountPoints({
      sourceVolume: config.ocflVolumeConfig.name,
      containerPath: '/etc/share/ocfl',
      readOnly: false,
    });

    this.ssh.addMountPoints({
      sourceVolume: config.configVolumeConfig.name,
      containerPath: '/etc/share/config',
      readOnly: false
    });

    const assetLocation = this.resolveAsset(base.express.location);
    this.oniExpress = this.addContainer('oni-express', {
      image: ecs.ContainerImage.fromAsset(assetLocation),
      memoryLimitMiB: base.express.memory, // Default is 512
      essential: true,
      environment: {
        NODE_ENV: 'development'
      },
      healthCheck: {
        command: [
          "CMD-SHELL",
          "curl -f http://localhost:8080/ || exit 1"
        ],
        retries: 10,
        timeout: cdk.Duration.seconds(60)
      },
      logging: logging
    });
    this.oniExpress.addMountPoints({
      sourceVolume: config.ocflVolumeConfig.name,
      containerPath: '/etc/share/ocfl',
      readOnly: false,
    });
    //this.oniExpress.addMountPoints(config.logsMount);
    this.oniExpress.addMountPoints({
      sourceVolume: config.configVolumeConfig.name,
      containerPath: '/etc/share/config',
      readOnly: false
    });
    this.oniExpress.addPortMappings({
      containerPort: 8080,
      hostPort: 8080,
      protocol: ecs.Protocol.TCP
    });
    this.oniExpress.addUlimits({
      hardLimit: 65000,
      softLimit: 65000,
      name: ecs.UlimitName.CORE,
    });

    // this.logsMount = {
    //   sourceVolume: config.oniLogsVolume,
    //   containerPath: '/etc/share/logs',
    //   readOnly: false,
    // };
    //ContainerDependencies
    const solrAssetLocation = this.resolveAsset(base.solr.location);
    this.solr = this.addContainer('solr', {
      image: ecs.ContainerImage.fromAsset(solrAssetLocation),
      memoryLimitMiB: base.solr.memory, // Default is 512
      essential: true,
      command: ['solr-precreate', 'ocfl'],
      entryPoint: [
        'docker-entrypoint.sh'
      ],
      healthCheck: {
        command: [
          "CMD-SHELL", "curl -f 'http://localhost:8983/solr/admin/cores?action=STATUS&core=ocfl' || exit 1"
        ],
        retries: 10,
        timeout: cdk.Duration.seconds(60)
      },
      logging: logging
    });
    this.solr.addMountPoints({
      sourceVolume: config.solrVolumeConfig.name,
      containerPath: '/var/solr/data',
      readOnly: false
    });
    this.solr.addPortMappings({
      containerPort: 8983,
      hostPort: 8983,
      protocol: ecs.Protocol.TCP
    });
    this.solr.addUlimits({
      hardLimit: 65000,
      softLimit: 65000,
      name: ecs.UlimitName.CORE
    });

    this.memcached = this.addContainer('memcached', {
      image: ecs.ContainerImage.fromRegistry('memcached'),
      memoryLimitMiB: base.memcached.memory, // Default is 512
      essential: true,
      logging: logging
    });

    this.memcached.addPortMappings({
      containerPort: 11211,
      hostPort: 11211,
      protocol: ecs.Protocol.TCP
    });
    this.oniExpress.addContainerDependencies({
      condition: ecs.ContainerDependencyCondition.HEALTHY,
      container: this.solr
    });
  }

  resolveAsset(location: string): any {
    try {
      if (path.isAbsolute(location)) {
        if (fs.existsSync(location)) {
          return location;
        }
      } else {
        return path.resolve(process.cwd(), location);
      }
    } catch (err) {
      console.error(`check location == ${location} == it should be relative to this folder or absolute`);
      throw new Error(err);
    }
  }
}

