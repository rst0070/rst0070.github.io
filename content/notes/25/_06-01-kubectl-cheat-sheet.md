---
title: Kubectl cheat sheet
date: 2025-06-01
---
It's hard to search internet everytime when I deal with kubectl things, so I started to make cheat sheet of it.  
  
# `kubectl config`
- `kubectl config get-contexts`
    - get contexts
-  `kubectl config set-context --current --namespace=argo-workflows`
    - modify default namespace of current context
- `kubectl config use-context <context-name>`
    - switch to use the context
