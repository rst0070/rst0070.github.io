---
layout: post
categories: ["Javascript"]
title: "[Node.js] oracledb 모듈을 이용해 ORACLE 사용하기"
lastmod: 2022-04-09
---

- - -
## 1. [Oracledb 모듈 불러오기: Oracledb 객체 생성](https://oracle.github.io/node-oracledb/doc/api.html#-3-oracledb-class)
``` javascript
const oracledb = require("oracledb");
```  
위와 같이 oracledb 모듈을 불러오면 `oracledb`라는 변수에는 
oracledb 객체의 포인터가 저장된다. 즉 하나의 프로세스에서 여러개의 변수로 
oracledb 모듈을 불러와도 모두 같은 객체를 참조하는것이다.  
  
### 1.1 oracledb 객체는 무엇을 하는가?
*Pool* 객체와 *Connection* 객체를 생성할 기반의 역할을 하고 
DB관련 작업시 사용할 많은 [상수들을 갖고있다.](https://oracle.github.io/node-oracledb/doc/api.html#-31-oracledb-constants)  
  
*Pool* 과 *Connection* 객체는 DB와의 통신을 생성하고 관리하는 역할을 한다.  
- - -
## 2. Pool 생성하기
  
### 2.1 Pool의 개념
문서에 따르면 각각의 Pool 객체는 *[Oracle Call Interface Session Pool](https://docs.oracle.com/en/database/oracle/oracle-database/19/lnoci/session-and-connection-pooling.html#GUID-F9662FFB-EAEF-495C-96FC-49C6D1D9625C)* 라고 한다.  
이 Pool객체는 DB에 연결하기 위한 속성들을 저장하고 있으며 연결을 유지시켜 놓고 관리한다.  
이런 특성의 장점은 다음과 같다.  
- 여러개의 연결이 발생할때 중복 사용되는 데이터를 Pool이 처리해 준다.
- 새로운 연결을 만들때의 대기시간이나 자원낭비가 없다.(Pool객체가 DB와의 연결을 
유지하고 있다.)  

### 2.2 생성하기: [oracledb.createPool()](https://oracle.github.io/node-oracledb/doc/api.html#createpool)   
``` javascript
oracledb.createPool(Object poolAttrs, function(Error error, Pool pool){});
```
위와 같이 oracledb 객체에 속한 함수를 통해 콜백방법으로 생성할 수 있다.  

#### 2.2.1 Parameters: Object poolAttrs  
Pool을 생성하는데 필요한 세부사항들을 key:value(javascript 객체)
로 정의한 객체이다.
  
[문서](https://oracle.github.io/node-oracledb/doc/api.html#-3311-createpool-parameters-and-attributes)를 보면 여러가지 속성들을 찾을수 있다. 
이 글에서는 중요한 속성들만 언급하려한다.  
  
| 속성 이름 | Type | 설명 |
| --- | --- | --- |
| connectString | String | tnsnames.ora에 등록된 서비스 이름이 *MYDB*이고 리스너가 *localhost:1521*에 위치해 있다면 값은 `"localhost:1521/MYDB"`가 될 것이다. |
| user | String | 사용하려는 Oracle 계정의 이름이다. |
| password | String | 위 user의 패스워드 |
| poolAlias | String | 생성되는 *Pool*은 *Connection Pool Cache*에 등록되는데 이때 해당 *Pool*을 구별하는 식별자의 역할을 하는것이 *poolAlias*이다. *oracledb.getPool()*등의 함수에 파라미터로 전달하여 해당 *Pool*을 얻을수 있다. |
  
이것들 외에도 Pool에서 관리할 Conection의 개수를 제한하거나, 
관리되는 Connection들에 같은 속성을 부여할 것 인지 설정하는등 
여러가지를 설정할 수 있다.  
  
#### 2.2.2 Callback function  
``` javascript
function(Error error, Pool pool)
```  

| Parameter | 설명 |
| --- | --- |
| Error error | createPool()이 성공한다면 NULL값이지만 실패한다면 [오류 메세지](https://oracle.github.io/node-oracledb/doc/api.html#errorobj)를 포함한다. |
| [Pool](https://oracle.github.io/node-oracledb/doc/api.html#poolclass) pool | 새로 생성된 connection Pool이다. Pool 생성을 실패했다면 NULL 값을 가진다. |  

- - -
## 3. Connection 만들기: oracledb.getConnection()  
getConnection() 합수는 여러 종류가 있어서 Pool 없이 연결을 만들수도 있다. 
하지만 Pool을 사용하는 것이 Oracle의 권장사항이어서 Pool을 사용하는 콜백방법에 
대해서만 알아보려한다. 다른 방법들은 [이곳](https://oracle.github.io/node-oracledb/doc/api.html#-332-oracledbgetconnection)에 있다.  
  
``` javascript
oracledb.getConnection(String poolAlias, function(Error error, Connection connection){})
```
위와 같이 oracledb객체의 메소드로 Connection을 얻을 수 있다.  
  
poolAlias는 위에서 언급한 'pool을 식별하는 문자열'이다. poolAlias를 파라미터로 전달하지 
않으면 가장 최근에 Pool cache에 올라간 Pool을 사용한다.  
  
콜백함수의 error 파라미터는 
connection 생성에 성공하면 NULL이고, 실패하면 Error 객체가 된다.  
생성에 실패하면 Connection 객체는 NULL값으로 들어온다.  
  
<!-- ## 4. SQL 실행하기: connection.execute()생성된 connection객체에서 execute()함수를 통해 쿼리를 실행할 수 있다.  -->