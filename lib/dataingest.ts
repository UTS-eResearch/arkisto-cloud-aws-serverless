import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as fs from 'fs';
import * as utils from "./utils";

export default class DataIngest extends ecs.FargateTaskDefinition {
  ssh: any;

  constructor(scope: cdk.Construct, id: string, props: ecs.FargateTaskDefinitionProps, config: any) {
    super(scope, id, props);
    const base = config.base;

    const util = new utils.default();

    let sshPublicKey = fs.readFileSync(base.ssh.public_key, 'utf8');
    sshPublicKey = sshPublicKey.replace(/\r?\n|\r/g, " ");
    const sshAssetLocation = util.resolveAsset(base.ssh.location);
    this.ssh = this.addContainer('ssh', {
      image: ecs.ContainerImage.fromAsset(sshAssetLocation),
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
          "ps aux | grep sshd || exit 1"
        ],
        retries: 10,
        timeout: cdk.Duration.seconds(60)
      },
      logging: config.logging
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
  }
}
