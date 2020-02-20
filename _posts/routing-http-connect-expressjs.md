---
layout: post
tags: [node.js]
title: "[Node.js] HTTP모듈, connect 모듈, express 프레임워크 각각에서 라우팅 구현하기"
---
# 라우팅 이란?
라우팅은 서버측에서 클라이언트의 요청에 적절한 응답을 제공하는 
것을 의미한다. 곧 클라이언트의 요청을 분류하고 적절한 
응답을 찾아 전송해야한다.  
  
# HTTP 모듈에서 구현하기  
HTTP모듈은 Node.js의 기본 내장모듈이다. 
라우팅을 위한 함수를 따로 제공하지 않으므로 직접 클라이언트의 
요청을 분석해야한다.  
  
클라이언트의 요청은 *request*객체에서 확인할 수 있다.
request객체는 http모듈의 *createServer()*메소드를 통해 
*server*객체를 생성한 후 *request요청*이 발생하면 생성된다.
아래 예시의 이벤트리스너의 req가 request객체이다.
``` javascript
//http 모듈을 가져온다.
var http = require('http');
//서버를 생성한다.
var server = http.createServer();

//server 객체에 이벤트리스너를 연결한다.
server.on('request', (req,res)=>{
    //request, response 객체를 받는다.
    //다음은 request객체의 속성들이다.
    
    
});

server.listen(3000);
```