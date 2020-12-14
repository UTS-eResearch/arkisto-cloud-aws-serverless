#! /bin/bash

ssh_cmd="ssh -i ./key/id.rsa"

user=arkisto
dns=$(source cdk_get_output.sh sshLoadBalancer)

sync_dir=$(node -pe 'JSON.parse(process.argv[1]).context.base.ocfl' "$(cat cdk.json)")

rsync --rsync-path='sudo rsync' --chown=root:root --delete -og --no-o -azP -e "${ssh_cmd}" ${sync_dir}/ ${user}@${dns}:/etc/share/ocfl
