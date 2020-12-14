import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as utils from "./utils";

import * as logs from "@aws-cdk/aws-logs";

export default class Base extends ecs.FargateTaskDefinition {
  solr: any;
  memcached: any;

  constructor(scope: cdk.Construct, id: string, props: ecs.FargateTaskDefinitionProps, config: any) {
    super(scope, id, props);
    const base = config.base;

    const util = new utils.default();


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

  }


}

