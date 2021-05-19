import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as utils from "./utils";

export default class Oni extends ecs.FargateTaskDefinition {
  oniExpress: any;
  indexer: any;
  withIndexer: boolean = true;
  solr: any;
  memcached: any;

  constructor(scope: cdk.Construct, id: string, props: ecs.FargateTaskDefinitionProps, config: any) {
    super(scope, id, props);
    const base = config.base;

    if(!base.indexer) {
      this.withIndexer = false;
    }
    const util = new utils.default();

    const expressAssetLocation = util.resolveAsset(base.express.location);
    this.oniExpress = this.addContainer('oni-express', {
      image: ecs.ContainerImage.fromAsset(expressAssetLocation),
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
      logging: config.logging
    });

    this.defaultContainer = this.oniExpress;

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

    const solrAssetLocation = util.resolveAsset(base.solr.location);
    this.solr = this.addContainer('solr', {
      image: ecs.ContainerImage.fromAsset(solrAssetLocation),
      memoryLimitMiB: base.solr.memory, // Default is 512
      essential: true,
      command: ['/bin/sh -c \"chown -R 8983:8983 /var/solr/data; exec gosu solr:solr solr-precreate ocfl\"'],
      entryPoint: [
        "sh",
        "-c"
      ],
      healthCheck: {
        command: [
          "CMD-SHELL", "curl -f 'http://localhost:8983/solr/admin/cores?action=STATUS&core=ocfl' || exit 1"
        ],
        retries: 10,
        timeout: cdk.Duration.seconds(60)
      },
      user: '0:0',
      logging: config.logging
    });
    this.oniExpress.addContainerDependencies({
      container: this.solr,
      condition: ecs.ContainerDependencyCondition.HEALTHY
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

    if(this.withIndexer) {
      const indexerAssetLocation = util.resolveAsset(base.indexer.location);
      this.indexer = this.addContainer('oni-indexer', {
        image: ecs.ContainerImage.fromAsset(indexerAssetLocation),
        memoryLimitMiB: base.indexer.memory, // Default is 512
        essential: false,
        logging: config.logging
      });
      this.indexer.addMountPoints({
        sourceVolume: config.ocflVolumeConfig.name,
        containerPath: '/etc/share/ocfl',
        readOnly: false,
      });
      //this.indexer.addMountPoints(config.logsMount);
      this.indexer.addMountPoints({
        sourceVolume: config.configVolumeConfig.name,
        containerPath: '/etc/share/config',
        readOnly: false
      });
      this.indexer.addPortMappings({
        containerPort: 8090,
        hostPort: 8090,
        protocol: ecs.Protocol.TCP
      });
      this.indexer.addUlimits({
        hardLimit: 65000,
        softLimit: 65000,
        name: ecs.UlimitName.CORE,
      });
      this.indexer.addContainerDependencies({
        container: this.oniExpress,
        condition: ecs.ContainerDependencyCondition.HEALTHY
      });
    }
    // this.logsMount = {
    //   sourceVolume: config.oniLogsVolume,
    //   containerPath: '/etc/share/logs',
    //   readOnly: false,
    // };
    //ContainerDependencies
  }
}

