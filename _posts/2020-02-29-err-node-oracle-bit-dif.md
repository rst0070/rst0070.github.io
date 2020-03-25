---
layout: post
tags: [err, oracle, node.js]
title: "[Error] DPI-1047 : node.js 와 oracle client의 호환문제"
---
## 배경
node.js에서 `oracledb`모듈을 사용하는데 아래와 같은 오류가 발생했다.  
```
Error: DPI-1047: Cannot locate a 64-bit Oracle Client library:
"D:\app\kwb07\product\11.2.0\dbhome_1\bin\oci.dll is not the correct architecture". 
See https://oracle.github.io/odpi/doc/installation.html#windows for help
Node-oracledb installation instructions: https://oracle.github.io/node-oracledb/INSTALL.html
You must have 64-bit Oracle client libraries in your PATH environment variable.
If you do not have Oracle Database on this computer, then install the Instant Client 
Basic or Basic Light package from
http://www.oracle.com/technetwork/topics/winx64soft-089540.html
A Microsoft Visual Studio Redistributable suitable for your Oracle client library 
version must be available.
```  
local 컴퓨터에 32bit 오라클과 64bit node.js 가 설치되어있는 상황에서 
node.js와 오라클에서 기본으로 제공하는 클라이언트 툴 사이의 호환이 되지 않아 
이와 같은 오류가 발생한것이다.  
  
해결방법은 간단하다.  
*64bit Oracle Instant Client 를 다운받아 환경 변수 설정을 한다.* 
만약 32bit가 필요하다면 32bit Instant Client를 받으면 된다.  
  
## 1. Instant Client 다운받기  
[Oracle에서 받는다.](https://www.oracle.com/kr/database/technologies/instant-client/downloads.html) 
자신에게 해당되는 버전을 선택하고 *Basic Package*와 *SDK Package*를 받으면 된다.  
  
두 압축파일을 풀어 하나의 폴더로 합치면 끝.  
  
## 2. 환경변수 설정  
앞에서 합친 폴더를 시스템 환경변수의 *Path* 변수에 추가한다.  