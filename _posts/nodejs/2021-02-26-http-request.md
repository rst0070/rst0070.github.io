---
layout: post
tags: ['node.js', 'http']
title: "node.js로 http request 보내기"
---
## 개요
node.js 에 기본 탑재되어있는 http 모듈을 이용해 http.ClientRequest 객체를 생성하고 데이터를 붙여 전송하는 방법을 다룹니다.  
1. <a href="#stepA">request 생성하기</a>
2. <a href="#stepB">데이터 및 request 전송</a>
3. <a href="#stepC">response 처리</a>  
  
[node.js 문서](https://nodejs.org/dist/latest-v14.x/docs/api/http.html)를 참고하며 작성했습니다.  

## <a name="stepA">1. ClientRequest 생성</a>
`http.request(url[,options][,callback])`과 `http.request(options[,callback])`함수의 반환값을 통해 생성할 수 있습니다.  
  
`option`파라미터는 헤더, request방식등을 담고 있는 객체이며  
`callback`은 해당 request에 대한 서버의 응답(response 이벤트 호출시)시 호출되는 함수입니다.  

post요청 예시
```javascript
const http = require('http');
const data = {...}
const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Content-Length': Buffer.byteLength(data);
    }
}
const req = http.request("https://example.com", options, ()=>{});
```
## <a name="stepB">2. 데이터를 붙여 전송하기</a>
`ClientRequest.end([data[,encoding]][,callback])`를 통해 전송가능합니다.  
  
파라미터인 `data`는 문자열이고 `callback`은 전송이 끝났을때 호출되는 함수 입니다.  
 
`ClientRequest.end()`에 문자열화 된 data를 넣어 실행 시키면 테이터를 붙여 전송하게 됩니다.  
  
 ```javascript

const http = require('http');

const data = JSON.stringify({
    data: "hello"
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Content-Length': Buffer.byteLength(data);
    }
}
const req = http.request("https://example.com", options, (res)=>{});

req.end(data);
 ```
  
## <a name="stepC">3. response 받기</a>
<a href="stepA">앞에서</a>설명했듯이 `http.request()`의 마지막 파라미터를 통해 response 이벤트 발생시 객체를 얻을 수 있습니다.  
이때 객체는 `http.IncomingMessage'클래스의 인스턴스입니다.  
자세한 내용은 [api 참조](https://nodejs.org/dist/latest-v14.x/docs/api/http.html#http_class_http_incomingmessage)  
  
이 객체를 통해서 서버로부터 받은 데이터를 확인할 수 있습니다.
  
```javascript

const http = require('http');

const data = JSON.stringify({
    data: "hello"
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Content-Length': Buffer.byteLength(data);
    }
}
const req = http.request("https://example.com", options,
    (res)=>{
       console.log(res.body.mydata);
    });

req.end(data);
```











