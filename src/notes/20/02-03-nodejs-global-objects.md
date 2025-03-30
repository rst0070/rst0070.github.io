---
date: 2020-02-03
categories: ["Javascript"]
title: "[Node.js] 전역 변수, 전역 객체 (console, process, exports)"
lastmod: 2022-04-09
---
이 글은 Node.js의 전역 변수와 전역 객체를
정리한 글 입니다.  

# 전역 변수  
- `__filename`: 현재 실행중인 코드의 파일 경로를 가지는 문자열  
- `__dirname`: 현재 실행중인 코드의 디렉토리 경로를 가지는 문자열  
  
# console 객체
console 객체는 Node.js의 콘솔화면 기능을 다룹니다. console 객체의 메서드는 아래와 같습니다. 
- `log()`: print 기능을 가지며 특수문자를 
이용해 문자열을 출력할 수 있습니다.
  - `%d`: 숫자
  - `%s`: 문자열
  - `%j`: JSON  
- `time(label)`: 시간 측정을 시작합니다.
- `timeEnd(label)`: 시간 측정을 종료합니다.  

*예시 코드*  
```
console.log("%d * %d = %s", 10, 10, '100');
console.log("json: %j", {"name" : "rst"});

console.time('t');
for(var i=0; i<99999; i++);
console.timeEnd('t');
```
*결과*
```
10 * 10 = 100
{"name":"rst}
t: 18172.890ms
```

# process 객체  
process 객체는 프로그램과 관련된 정보를 포함하는 객체입니다.  
- - -
process 객체의 속성
- `argv`: 실행 매개 변수를 포함
- `env`: 컴퓨터 환경 정보 포함
- `version`: Node.js의 버전 정보
- `versions`: Node.js와 종속된 프로그램의 버전 정보
- `arch`: 프로세서의 아키텍쳐
- `platform`: 플랫포 정보  

- - -
process 객체의 메서드  
- `exit()`: 프로그램 종료
- `memoryUsage()`: 메모리 사용 정보 객체를 리턴
- `uptime()`: 현재 프로그램이 실행된 시간을 리턴  
  
# exports 객체
exports 객체는 모듈을 생성할때 사용합니다.  
exports 객체의 속성을 정의하는 방식으로 작동합니다. 
예시를 보는것이 이해하기 쉽습니다.  
  
*md.js*
``` javascript
exports.sum = function(a, b){
    return a+b;
}
```  
  
*app.js*
``` javascript
var md = require('./md.js');
var c = md.sum(2,3);
console.log(c);
```
  
언급하지 않아도 되겠지만 결과는 `5`가 출력됩니다.