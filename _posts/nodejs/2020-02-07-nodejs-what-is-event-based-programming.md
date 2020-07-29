---
layout: post
categories: Node_js
tags: [node.js, javascript]
title: "이벤트 기반 비동기 방식이란? 어떻게 동작하는거지?
Node.js Javascript"
---


# 배경
 Node.js를 처음 접했을때 *이벤트 기반 비동기 처리* 방식을
사용한다는 사실을 알게됐다. *모던 웹을 위한 Node.js 프로그래밍*
이라는 책에서는 이 방식을 아래의 *시장 대기표* 예시로
설명했다.  
- - -
시장 여러곳의 가게에서 물건을 구매해야한다.  
이때 각 가게에는 손님들이 줄을 서서 대기하고 있다.  
빠르게 모든 물건을 구매하기 위해선 두가지 방법이 있는데  
1. 몸을 복제해 동시에 여러가게에 간다.
2. 시장을 대기표를 나누어주는 시스템으로 바꾸고
대기표만 받고 기다린다.  

1번의 방식은 기존의 스레드 기반 네트워크 프로그램의 방식이며,  
2번은 이벤트 기반 비동기 방식이다.  
- - -
이 예시를 통해서 이벤트 기반 비동기 방시기 어떤
방식인지 이해할 순 있었다. 하지만 이것이 어떻게 가능한지,
진짜 단일 스레드로 가능한건지 궁금해졌다.  

# Multi Thread 방식
Multi Thread 방식의 서버의 요청처리는 각 요청마다
새로운 Thread를 발생시켜 처리하는 방식이다.
아래의 java코드로 이해해 볼 수 있다.  
``` java
//server-socket 80번 포트에서 bind
ServerSocket ss = new ServerSocket(80);
while(true) {
  //연결 생성
  Socket s = ss.accept();
  //새로운 스레드 발생시켜 처리과정 넘기기
  MutiThreadHttp mt = new MutiThreadHttp(s);
  //스레드 시작             
  mt.start();
}
```
이 방식은 클라이언트 요청이 몰릴수록 그에 대응되는 많은
스레드가 발생하므로 메모리 자원을
많이 소모하게 된다. 즉 서버의 자원에 제한을 받는다.  
또 프로그래밍시 Thread간 공유자원 관리에 주의 해야하는
단점이 있다.  


# 이벤트 기반 비동기 방식  
javascript는 이벤트 기반 비동기 방식으로 작동한다.  
이 방식을 따르는 Node.js는 여러 클라이언트들의 요청을
하나의 스레드로 처리하며 각각의 요청에서 이벤트가 발생할 때만 그에 맞는 작업을 처리한다.  

어떠한 원리로 이벤트 기반 비동기 방식이 작동하는지 궁금해졌고
아래의 문서들을 통해 이해할 수 있었다.  
- [Understanding JS: The Event Loop](https://hackernoon.com/understanding-js-the-event-loop-959beae3ac40)
- [Node.js: 비동기 프로그래밍 이해](http://www.nextree.co.kr/p7292/)  

이벤트 기반 비동기 방식은 **Event Loop**에 의해 이루어진다.
Node.js에서 클라이언트의 요청을 처리하는 방식을 보면
이해할 수 있다.  
![eventbased-eg-req](/assets/img/what-is-event-based-programming-javascript.jpg)  
위와같이 할 수 있는 이유는 요청에서 발생하는 이벤트와 콜백들을
이벤트 루프에서 처리하기 때문이다.
이 과정을 이해하려면 Call Stack, Event Table, Event Queue
에 대해 알아야한다.  

##  Call Stack  
Javascript에서 함수를 호출하게 되면 이를 Callstack에 넣는다.  
이름 그대로 Stack이므로 나중에 들어간 함수가 먼저 실행되고
먼저들어간 함수가 나중에 실행된다.  
실행중인 함수가 다른 함수를 호출하면 호출받은 함수가
Callstack의 맨 위에 올려진다.  

Javascript는 오직 하나의 Callstack을 가져서 모든 함수의 실행은
Callstack에서 이루어진다고 볼 수 있다.  

하지만 Callstack만으로는 javascript가 이벤트를 비동기처리 하는
과정을 설명할 수 없다.  
예를들어 10초후에 특정함수가 실행되도록 타이머를 설정한다면,
모든 처리가 10초 늦춰진다고 밖에 설명할 수 없다.  

##  Event Table, Event Queue
위의 예시와같이 이벤트가 발생해야 실행되는 함수를 Event Table
에서 저장한다. 이때 Event Table은 특정 이벤트와 그에 대응되는
함수를 저장하고 이벤트가 발생하면 대응되는 함수를 Event Queue에
넣는다.  

Event Queue는 말 그대로 '큐'이므로 들어온 순서대로 함수를
수행한다.  
하지만 함수를 실행시키는것은 Callstack에 쌓인 함수만 가능하므로
아직 수행해야할 작업이 남아있다.  

##  Event Loop
Event Loop는 이벤트에 대응되는 함수를 Callstack에 쌓는
역할을 한다.  
작업의 과정은 다음과 같이 진행된다.
1. Callstack이 비어있는지 확인한다.
2. 비어있다면 Event Queue가 비어있는지 확인한다.
3. 큐가 비어있지 않다면 Event Queue의 앞에서 함수를 가져와 Callstack에 쌓는다.  

# 결론  
전체적으로 Event Loop를 통해 이벤트 기반 비동기 방식이 작동한다.  
곧 코드작성자의 코드가 하나의 Thread에 기반해서 실행될 수 있도록
내부적으로 여러개의 Thread를 발생시키는 방법인것이다.  

지금까지 살펴본 Event Loop의 작업방식을 확인해 볼 수 있는
코드가 있다.
``` javascript
setTimeout(() => console.log('first'), 0)
console.log('second')
```
실행시켜보면 'second'가 먼저 출력되고 'first'가 나중에 출력된다.  
다음의 과정으로 처리가 된 것이다.
1. setTimeout()이 호출되어 콜스택에서 실행된다.
2. event table에 'first'출력 함수가 저장된다.
3. 'second'출력이 콜스텍에 올라가고 'first'출력이 이벤트 큐에 올라간다.
4. Event Loop는 콜스텍이 비어야 Event Queue에서 함수를 꺼내오므로 'second'출력이 먼저 발생하고 'first'출력이 콜스텍에 올라가 실행된다.  

이벤트 기반 비동기 방식은 Multi Thread 방식보다 Thread를 적게
사용하여 메모리 자원을 절약할 수 있는 이점이 있다.  
하지만 각각의 이벤트들이 많은 연산이 필요하거나 대용량의 IO를
다루는 작업등의 많은 시간이 필요한 작업이라면 성능의 저하를
가져올 수 있다.  

프로그래밍시 주의해야 할 점은 javascript가 비동기 언어라는
점을 꼭 인식해야한다는 것이다.  
자신이 작성한 코드중 무엇이 먼저 실행될지 모르기 때문에
콜백방법을 이용하여 순차적으로 실행되도록 해야한다.  
또, 콜백함수를 받는 함수를 작성할때도 비동기적 방식으로 처리된다는
것을 유의하고 콜백함수를(콜백을 쓰거나 다른 라이브러리를 사용하여)
원하는 시점에 실행시키도록 주의해야한다.  
