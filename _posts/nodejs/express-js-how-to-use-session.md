---
layout: post
categories: Node.js
tags: [node.js, express.js]
title: "Express 프레임워크에서 Session 사용하기"
---

## 개념
세션을 통해 서버측에서 정보를 저장.
근데 이 세션을 분별하는 방법은 세션아이디인데 세션아이디를 쿠키에 저장해서
다시 요청이 들어올때 쿠키에서 세션아이디를 뽑아서 세션스토어에서 식별하여 찾아온다.