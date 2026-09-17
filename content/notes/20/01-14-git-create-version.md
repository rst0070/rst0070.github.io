---
categories: ["Tools"]
title: "[Git] 1. 버전관리의 개요와 버전관리 시작하기"
date: 2020-01-14
lastmod: 2022-04-09
---

## 버전관리
git은 버전관리를 제공하는 소프트웨어이며 '.git'폴더에서 변경사항을 관리한다.  
아래의 용어들을 통해 git이 작동하는 방식을 알 수 있다.
- repository: 버전이 저장되어있는곳(.git 폴더로 생각할 수 있다.)
- working tree: 변경사항들이 버전으로 전환되기 전 단계
- staging area: working tree에서 버전으로 저장할 파일들을 선택하여 올려놓는 공간.

## 버전관리 시작

```
git init .
```
여기서 .은 현재 디렉토리를 가리킨다.
이 명령을 수행하면 해당 디렉토리에 '.git'이라는 폴더가 생성된다.
이 폴더안의 데이터를 이용해 git이 버전관리를 한다.  

## 버전 생성

 git은 버전관리를 했던 파일에 대해 추적을 한다.  
즉 버전관리를 하지 않은 파일은 추적하지 않는다.  
대상 파일을 staging area로 올리면 버전관리의 대상이 된다.  
staging area로 올리기 위해선 `add` 명령을 이용하면 된다.
```
git add file.txt
```

이제 commit 명령을 하면 버전이 생성된다.
곧 repository에 저장되는것이다.
```
git commit -m "this is message"
```

확인하기위해선 `log`명령을 하면 된다. [git 문서 참조](https://git-scm.com/docs/git-log)
```
git log
```

이제 git이 추적하는 파일을 수정하면 어떻게 될까?
파일 수정후 status 명령을 하면

```
$ git status
On branch master
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   file.txt

no changes added to commit (use "git add" and/or "git commit -a")
```
'changes not staged for commit' 메세지를 보면 수정된 file.txt파일이 staging area에 올라가 있지 않다는 것을 알 수 있다.  
즉 working tree에 변경사항이 있다는 것이며 `add` 명령으로 staging area에 추가하여 commit의 대상으로 지정할 수 있다.
```
git add file.txt
```
이후 commit 명령을 하면 변경사항이 repository에 저장되며
git log 명령을 통해 확인할 수 있다.

## 편의를 위한 명령어들
```
git add .
#현재폴더의 모든 파일을 staging area에 올린다.

git commit -am "this is message"
#-am은 add와 message기능을 사용한다는 의미
```
