#! /bin/bash

ssh_key=$(node -pe 'JSON.parse(process.argv[1]).context.ssh_access_key' "$(cat cdk.json)")
ssh_cmd="ssh -i ./key/${ssh_key}.pem"

user=ec2-user
dns=$(source cdk_get_asg_dns.sh)

sync_dir=$(node -pe 'JSON.parse(process.argv[1]).context.base.ocfl' "$(cat cdk.json)")
dest_sync_dir=$(node -pe 'JSON.parse(process.argv[1]).context.base.mount_dir' "$(cat cdk.json)")/ocfl

rsync --rsync-path='sudo rsync' --chown=root:root --delete -og --no-o -azP -e "${ssh_cmd}" ${sync_dir}/ ${user}@${dns}:${dest_sync_dir}
