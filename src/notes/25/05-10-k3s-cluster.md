---
title: asdasdasd
date: 2025-05-10
---
# Master

curl -sfL https://get.k3s.io | sh -s - server \
    --token=821039977292 \
    --flannel-backend none \
    --node-taint CriticalAddonsOnly=true:NoExecute \
    --tls-san 192.168.0.100 \
    --datastore-endpoint="postgres://k3s_manager:azNzX21hbmFnZXIK@192.168.0.100:54320/k3s_datastore"


get token 
```
sudo cat /var/lib/rancher/k3s/server/node-token
```
K10a8000738e601b2d3b3111925b6b04e07667b6565253e2941cd488ed13f635f6b::server:821039977292

# Agent
curl -sfL https://get.k3s.io | K3S_URL=https://192.168.0.100:6443 sh -s - agent --token K10a8000738e601b2d3b3111925b6b04e07667b6565253e2941cd488ed13f635f6b::server:821039977292