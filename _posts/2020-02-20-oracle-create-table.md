---
layout: post
tags: [oracle, sql]
title: "[Oracle] Table 생성과 제약조건 (선언적 무결성 제약조건 추가하기)"
---
Oracle에서 Table을 생성하고 제약조건을 추가하는 방법을 공부했다. 
그 방법을 정리하려 포스팅을 하게 되었다.  
  
## 테이블 만들기: 기본적인 형태  

```
create table [스키마.]<테이블 이름> (
<열 이름> <데이터 타입> [default <표현식>] [<제약조건>]
[,<열 이름> <데이터 타입> [default <표현식>] [<제약조건>]]
[,...]
);
```  
[]: 선택사항  
<>: 필수사항  
  
* *스키마*: 만들어질 테이블이 속하는 스키마
* *테이블 이름*: 만들어질 테이블의 이름
* *열 이름*: 테이블의 열 이름
* *데이터 타입*: 해당하는 열의 데이터 타입
* *default <표현식>*: insert 구문에서 열의 값이 지정되지 않는 경우 
디폴트 값을 지정한다. <표현식>에는 정적값이나 sql함수를 지정할 수 있다.  
* *제약조건*: 각 열의 데이터가 갖춰야할 제약조건을 정의할 수 있다.  
  
## 테이블 만들기: select 구문 이용  
`create table <table name> as select...`형태의 구문으로 
select를 사용해 table을 생성할 수 있다.  
**예시**  
```
create table another_dept
as select * from scott.dept;
```  

## 제약조건이란?  
Oracle은 데이터베이스의 데이터가 의도한 대로 저장되고 
데이터베이스의 다른 부분과 결함없이 작동하도록 제약조건을 제공한다.  

이때 제약조건을 적용하는 방법을 두가지로 분류할 수 있다.  

* **선언적 방법**: 
테이블의 선언(생성 및 변경)과 함께 규칙을 저장한다. 
테이블간의 관계에 대한 규칙, 테이블 열에 들어가야할 데이터의 규칙등을 지정한다. 
테이블에 저장되는 모든 행에 적용된다.  

* **절차적 방법**: 
작업과정중에는 데이터에 제약조건을 추가해야하는 상황이 발생하며 선언적 
방법만으로는 이를 충족하기 어렵다. 따라서 절차적 방법으로 
데이터에 제약조건을 추가하는데 이를 *사용자 정의 무결성* 이라고 한다.  
  
이 글에서는 Oracle의 **선언적 무결성 제약조건** 추가방법을 알아보려한다.  
Table을 새로 생성할때는 `create table` 구문에서 제약조건을 추가 할 수 있다(앞에서 살펴봤다).  
이미 존재하는 Table에 제약조건을 추가할 때는 아래와 같이 `alter table add`를 사용한다.
```
alter table [스키마.]<Table이름>
add [constraint <제약조건의 이름>]
<제약조건 정의>
/
```  
  
  
## 제약조건 추가하기: 1. 기본키 추가  
기본키는 Table에서 각각의 행을 구분짓는 키의 역할을 한다. 
따라서 NULL이 될 수 없고 행을 구분 지을수 있도록 유일한 것 이어야 한다.  
기본키는 하나의 열이나 여러개 열의 모음으로 정의할 수 있다.   
  
**Table 생성시 기본키 정의**  
``` sql
create table this_is_test (
no varchar2(4) primary key,
name varchar2(10)
);
```
위의 sql을 실행한 결과는 아래와 같은데 NO 항목이 기본키(Primary Key)로 
정의된 것을 확인할 수 있다.  
![pk](/assets/img/2020-02-20-oracle-create-table/pk1.png)  

**이미 생성된 Table에 기본키 제약조건 적용**  
``` sql
alter table this_is_test
add constraint ct_name primary key(no)
/
```
## 제약조건 추가하기: 2. 외부키 추가  
외부키는 다른 Table과 연결되는 기능을 한다.  
이때 테이블간에 부모-자식 관계가 발생한다. 제약조건이 적용되는 테이블은 
자식이고 그것이 아닌쪽이 부모이다.  
  
외부키를 적용할때 `references`라는 키워드로 부모 테이블과 연결 시킨다.  
  
이미 존재하는 테이블에는 다음과 같이 사용한다.  
```
...
alter table [스키마.]<Table이름>
add [constraint <제약조건의 이름>]
foreign key (<외부키에 해당되는 한 열 또는 여러 열>)
references <부모테이블 이름> (<외부키와 연결되는 한 열 또는 여러 열>)
/
```  

테이블 생성시 외부키 정의방법은 `references`키워드만 사용한다.  
**테이블 생성 예시**
``` sql
create table child (
no varchar2(4) references parent (no),
phone varchar2(11)
);
```
  
## 제약조건 추가하기: 3. 유일조건 추가  
유일조건은 지정하는 열들이 NULL값이 아닐때 
테이블내에서 행마다 유일하도록 하는 제약조건이다.  
곧 행을 구분할 수 있는 수단이 될 수 있다.  
  
다음의 방법으로 사용하면 된다.  
```
unique(<열1>[,<열2>][,...])
```
  
## 제약조건 추가하기: 4. CHECK조건 추가  
이 조건은 테이블 내의 모든 행에 적용되는 조건이다.  
대상이 되는 행이 check 조건을 만족해야한다.  
  
**예시**  
``` sql
alter table people_who_is_male
add constraint check_gender
check(gender in ('MALE'));
```  
위의 예시에서 `gender`는 `people_who_is_male`테이블의 
열이다.  
