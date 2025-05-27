---
title: "Set volumes on k3s cluster"
date: 2025-05-27
---

# Basic concept
`pod -> persistent volume claim -> persistent volume`  
  
- persistent volume: cluster-wide concept
- persistent volume claim: concept in namespace
  
If we use pure persistent volume, we need to set one persistent volume per one persistent volume claim. So it needs to be 1:1 mapping.  
  
However, `Storage Class` does mapping automatically.  
  
# Storage class
