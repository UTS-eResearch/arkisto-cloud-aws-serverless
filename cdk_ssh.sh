#! /bin/bash

ssh_cmd="ssh -i ./key/id.rsa"

user=arkisto
dns=$(source cdk_get_output.sh sshLoadBalancer)

${ssh_cmd} ${user}@${dns}
