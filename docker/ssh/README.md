### Open SSH server


Test

```shell script
ssh arkisto@127.0.0.1 -p 2222 -o 'BatchMode=yes' -o 'ConnectionAttempts=1 -o 'StrictHostKeyChecking=no' true || exit 1
```
