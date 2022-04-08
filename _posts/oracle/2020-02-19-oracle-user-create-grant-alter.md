---
layout: post
categories: ["Oracle"]
title: "[Oracle] 스키마 생성, 권한부여, 수정, 삭제"
lastmod: 2022-04-09
---

## 사용자 생성하기: 'create user'
 oracle에서 사용자(스키마)를 생성하기 위해선 create user 
명령을 사용한다.  
``` sql
create user <user name>
identified by <user password>;
```
 
## 사용자에게 권한 부여하기
oracle에서 사용자에게 권한을 부여하기 위해선 `grant ... to ...`
명령을 사용한다.  
``` sql
grant <권한1>, <권한2>,...
to <user name>;
```  

## 사용자 관련 사항 수정하기: alter user  
사용자 계정과 관련된 사항을 수정할때는 `alter user`로 시작하는 
구문을 이용해 수정한다.  
### 1. 암호 변경하기
사용자를 생성할때 사용한 암호 정의 구문을 이용한다.  
``` sql
alter user <name>
identified by <password>
```  
### 2. 계정 잠금/해제
``` sql
alter user <name>
account [lock|unlock]
```  
### 3. 테이블 스페이스 변경
``` sql
alter user <name>
defualt tablespace <space name>
temporary tablespace <space name>;
```  
### 4. 테이블 스페이스 할당량 변경
`quota <할당량> on <tablespace 이름>`을 이용하면 된다.  
``` sql
alter user <name>
quota unlimited on users
quota 10M on temp
...;
```  
  
## 사용자 삭제하기
`drop user` 명령을 사용한다.