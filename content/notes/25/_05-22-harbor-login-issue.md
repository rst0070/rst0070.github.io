---
title: "Harbor login issue with helm chart installed"
date: 2025-05-22
---
# Overview
I tried to use harbor on my k3s cluster with helm chart installation. 
I followed installation guide on the [github](https://github.com/goharbor/harbor-helm), and got error like  
```bash
10.42.4.7 - - [21/May/2025:22:10:06 +0000] "POST /c/login HTTP/1.1" 405 559 "https://------.com/account/sign-in?redirect_url=%2Fharbor%2Fprojects" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
```
  
I found same issue on the github [issue-485](https://github.com/goharbor/harbor-helm/issues/485).  
  
# Solution


Actually it was about my custom ingress setting. because i wanted to use only one ingress inside a namespace. im fixing it now......