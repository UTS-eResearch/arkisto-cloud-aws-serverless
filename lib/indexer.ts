import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as utils from "./utils";

import * as logs from "@aws-cdk/aws-logs";

export default class Indexer extends ecs.FargateTaskDefinition {
  indexer: any;

  constructor(scope: cdk.Construct, id: string, props: ecs.FargateTaskDefinitionProps, config: any) {
    super(scope, id, props);
    const base = config.base;

    const util = new utils.default();

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
  }
}

