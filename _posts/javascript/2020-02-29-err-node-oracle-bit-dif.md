---
layout: post
category: ["Javascript"]
title: "[Error] DPI-1047 : node.js 와 oracle client의 호환문제"
lastmod: 2022-04-09
---
## 배경
node.js에서 `oracledb`모듈을 사용하는데 아래와 같은 오류가 발생했습니다.
```
Error: DPI-1047: Cannot locate a 64-bit Oracle Client library:
"D:\app\****\product\11.2.0\dbhome_1\bin\oci.dll is not the correct architecture". 
See https://oracle.github.io/odpi/doc/installation.html#windows for help
Node-oracledb installation instructions: https://oracle.github.io/node-oracledb/INSTALL.html
You must have 64-bit Oracle client libraries in your PATH environment variable.
If you do not have Oracle Database on this computer, then install the Instant Client 
Basic or Basic Light package from
http://www.oracle.com/technetwork/topics/winx64soft-089540.html
A Microsoft Visual Studio Redistributable suitable for your Oracle client library 
version must be available.
```  
위의 메세지를 읽어보면 64bit Oracle client libraries를사용하라고 합니다.  
저는 64bit node.js와 32bit Oracle DB를 사용하고 있었는데 둘의 호환에 문제가 생긴것입니다.  

해결방법은 간단합니다. 
*64bit Oracle Instant Client 를 다운받아 32bit client library보다 우선적으로 환경 변수 설정을 한다.* 
즉 node.js의 bit에 맞는 클라이언트 툴을 사용하도록 설정해주면 됩니다.
  
## 교훈?  
정말 사소한 문제지만 Oracle의 bit수를 염두해 두지 않아 당황했었습니다.  
오류는 정말 예상치 못한곳에서 발생할 수 있다는 걸 직접 체험했습니다.