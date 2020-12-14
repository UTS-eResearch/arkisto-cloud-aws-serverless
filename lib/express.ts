import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as utils from "./utils";

import * as logs from "@aws-cdk/aws-logs";

export default class Express extends ecs.FargateTaskDefinition {
  oniExpress: any;
  solr: any;
  memcached: any;
  ssh: any;

  constructor(scope: cdk.Construct, id: string, props: ecs.FargateTaskDefinitionProps, config: any) {
    super(scope, id, props);
    const base = config.base;

    const util = new utils.default();

    const expressAssetLocation = util.resolveAsset(base.express.location);
    this.oniExpress = this.addContainer('oni-express', {
      image: ecs.ContainerImage.fromAsset(expressAssetLocation),
      memoryLimitMiB: base.express.memory, // Default is 512
      essential: false,
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
      logging: config.logging
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
    const solrAssetLocation = util.resolveAsset(base.solr.location);
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
      logging: config.logging
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
      logging: config.logging
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


}

