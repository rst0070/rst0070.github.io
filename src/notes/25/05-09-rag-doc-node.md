---
title: Concepts of Document and Node for RAG
date: 2025-05-09
---

This is abstract concept for constructing database for RAG. 
- Document: original data source
    - Its hard to make embedding of whole content of it
- Node: part of the Document.
    - Its is splitted as a good size for generating embedding from its content
    - Its parent is Document and has sibilings