---
layout: post
categories: ["Java"]
tags: ["Docker"]
title: "[Spring boot] Dockerfile로 image 생성하기"
---
1. [Maven으로 .jar파일 빌드](#1-maven으로-jar파일-빌드)
2. [`Dockerfile`작성](#2-dockerfile작성)
3. [도커이미지 생성하기](#3-도커-이미지-생성하기)
4. [docker hub에 push하기](#4-docker-hub에-이미지-올리기)
5. [docker image 내려받고 실행](#5-docker-hub의-이미지-내려받고-실행시키기)

이 글에선 maven프로젝트를 `.jar`파일로 빌드한 후 이 파일을 도커이미지에 복사시켜 컨테이너에서 실행시키는 방법을 다룬다.  
[spring.io의 문서를 참고했다.](https://spring.io/guides/gs/spring-boot-docker/)  
- - -
## 1. Maven으로 .jar파일 빌드
이 글에선 `.jar`파일을 docker container에서 실행시키도록 `Dockerfile`을 작성할 것이다.  
따라서 먼저 maven프로젝트의 코드를 `.jar`파일로 빌드하자.  
```
mvn install
```
위 명령은 테스트를 거쳐서 프로젝트를 `build`하게 하는데 `target`폴더에 `.jar`파일을 생성해준다.  
- - -  
## 2. `Dockerfile`작성
`Dockerfile`은 도커가 이미지 생성시 해야할 작업들을 나열한 파일이다.  
프로젝트의 루트 폴더에 생성하고 아래와 같이 작성하면 된다.  
```docker
FROM openjdk:11
COPY target/front-office-0.0.1-SNAPSHOT.jar /app/app.jar
WORKDIR /app
CMD ["java","-jar", "app.jar"]
```
위 명령의 의미를 한 줄씩 해석해보면  
1. openjdk:11이미지를 사용한다. --> java 실행환경 구성
2. `target/front-office-0.0.1-SNAPSHOT.jar`파일을 컨테이너의 `/app/app.jar`파일로 복사시킨다. --> 실행파일을 복사시키기
3. `/app`폴더에서 명령을 실행시킨다.
4. `java -jar app.kar` 명령을 실행한다. --> 실행파일 실행  
- - -
## 3. 도커 이미지 생성하기
이제 위에서 만든 Dockerfile을 이용해 이미지를 생성한다.  
이미지 생성대상은 Dockerfile이 있는 폴더를 가리키면된다.  
```docker
# 현재 폴더의 Dockerfile을 이용해 'rst0070/myjava:latest'태그가 있는 이미지를 생성
docker build -t rst0070/myjava:latest .
```
  
이때 `-t`옵션으로 태그를 추가할 수 있는데 나중에 docker hub에 이미지를 push한다면 `<도커계정이름>/<repo이름>[:태그명]`으로 태그를 추가해야 docker hub에 push할 수 있다.
- - -  
## 4. docker hub에 이미지 올리기
push를 하기전에 도커계정에 로그인이 필요하다.  
```
docker login
```  
  
push 명령은 `도커계정이름/repo이름`으로 어느 push대상 repo와 local image를 찾는다.  
``` docker
# 도커 계정이 rst0070, repo 이름이 myjava인 곳에
# latest 태그가 붙은 이미지를 push 한다.
docker push rst0070/myjava:latest
```  
- - -
## 5. docker hub의 이미지 내려받고 실행시키기
`rst0070/myjava`를 내려받는다.  
```
docker pull rst0070/myjava
```
컨테이너화해서 실행시키는 명령은 다음과 같다.  
```
docker run -p 8080:8080 rst0070/myjava
```
* `-p`를 통해 특정 포트범위를 컨테이너와 로컬을 동기화시킴.
* 실행시킬땐 태그명을 통해 이미지를 특정함.
* 백그라운드에서 실행시키고 싶다면 `-d`옵션을 추가하면된다.