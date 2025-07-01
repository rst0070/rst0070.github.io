---
title: Deploy Airflow Helm Chart
date: 2025-06-24
lastmod: 2025-07-01
---

This note is about how I deployed airflow helm chart on home k3s cluster.  
The content would be:
- Build custom airflow docker image to use KubernetesPodOperator
- Value settings for git sync
- Configure kubernetes connection
  
# Build Airflow Image

I just made docker file like follows:
```Dockerfile
FROM apache/airflow:2.10.5-python3.11

USER airflow

RUN pip install apache-airflow-providers-cncf-kubernetes==10.5.0
```

and pushed it to my custom harbor repository
```bash
docker aa.bb.cc
docker build --platform linux/amd64 -t aa.bb.cc/common/airflow:latest -f Dockerfile .
docker push aa.bb.cc/common/airflow:latest
```
  
To use the image for the airflow, we need to change the values of the helm chart.  
I changed two parts like follows:  
```yaml
defaultAirflowRepository: aa.bb.cc/common/airflow

registry:
  connection:
    user: ~
    pass: ~
    host: aa.bb.cc
    email: ~
```
  
# Value Settings for Git Sync
To use git repository for gettting dag files, we need to set secret and corresponding values.  
I decided to use ssh login for git sync, so I made secret like follows:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: airflow-git-ssh-secret
  namespace: common
type: Opaque
data:
  # key needs to be gitSshKey
  gitSshKey: ~~~~~
```
To get the `gitSshKey` value, I used `ssh-keygen` and encoded with base64.  
The important things is that it should include all text(like "--- begin ...").  
  
To set values, you can following settings:
```yaml
executor: "KubernetesExecutor"

scheduler:
  extraVolumes:
    - name: git-sync-ssh-key
      secret:
        secretName: airflow-git-ssh-secret

dags:
  gitSync:
    enabled: true

    repo: git@github.com:rst0070/example.git
    branch: main # I use main branch
    rev: HEAD

    ref: main
    subPath: "dags" # I store dag files inside "dags" folder
    sshKeySecret: airflow-git-ssh-secret # I named the secret as airflow-git-secret
```
You can refer to this [issue](https://github.com/apache/airflow/issues/27476#issuecomment-1495150130), If you are curious about why the `scheduler.extraVolumes` is required.  
  
# Configure kubernetes connection
I followed instruction from [astronomer](https://www.astronomer.io/docs/learn/kubepod-operator/?tab=linux#step-2-update-the-kubeconfig-file).  
So the connection setting is following:
```json
{
    "apiVersion": "v1",
    "clusters": [
        {
            "cluster": {
                "certificate-authority-data": "<certificate-authority-data>",
                "server": "https://kubernetes.docker.internal:6443"
            },
            "name": "docker-desktop"
        }
    ],
    "contexts": [
        {
            "context": {
                "cluster": "docker-desktop",
                "user": "docker-desktop"
            },
            "name": "docker-desktop"
        }
    ],
    "current-context": "docker-desktop",
    "kind": "Config",
    "preferences": {},
    "users": [
        {
            "name": "docker-desktop",
            "user": {
                "client-certificate-data": "<client-certificate-data>",
                "client-key-data": "<client-key-data>"
            }
        }
    ]
}
```
As you can see the configuration has same structure of kubectl config file.  