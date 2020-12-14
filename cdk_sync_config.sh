#! /bin/bash

ssh_cmd="ssh -i ./key/id.rsa"
user=arkisto
#dns=$(source cdk_get_asg_dns.sh)
dns="Seafo-datas-L1V0FENHPQWG-1613997168.ap-southeast-2.elb.amazonaws.com"
sync_dir=$(node -pe 'JSON.parse(process.argv[1]).context.base.config' "$(cat cdk.json)")
echo ${sync_dir}
rsync --rsync-path='sudo rsync' --chown=root:root --delete -og --no-o -azP -e "${ssh_cmd}" ${sync_dir}/ ${user}@${dns}:/etc/share/config
