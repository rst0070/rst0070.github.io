---
layout: post
tags: [node.js]
title: "Node.js http 모듈"
---

## request 객체
request 객체의 속성들은 아래와 같다.
- method: 요청방식
- url: 요청한 url
- headers: 요청 헤더의 내용(json객체)
- trailers: 요청 트레일러 내용(json 객체)
- httpVersion: HTTP 프로토콜의 버전

## response 객체

메소드들은 아래와 같다.
- writeHead(statusCode, object): 응답헤더
- end([data], [encoding]): 응답본문

