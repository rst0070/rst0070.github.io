---
date: 2021-02-19
categories : ["Tools"]
title: "ssh key 생성, port변경, 접속하기"
lastmod: 2022-04-09
---
## ssh 개요
ssh는 ssh-server와 ssh-client간의 통신을 통해 client에서 server로 원격접속을 통해 server의 시스템 조작을 가능하게 해주는 도구이다.  
공개키-비공기키 방식을 통해 간편하고 안전한 접속을 가능하게 해준다. 

## 서버설정 및 실행 방법(리눅스 기준)
서버에는 openssh-server를 설치해주면 된다.
설치 후 `service ssh start` 명령을 통해 서버를 실행 시키면 된다.  

## 클라이언트 설정 및 접속 방법
설치해야할 프로그램은 openssh-client이다.  
설치 후 `ssh 유저아이디@서버주소` 명령을 통해 접속한다.
(이때 ssh의 기본 포트인 22번으로 접속하게 된다.)  
  
 접속을 해보면 패스워드를 물을 것이다. 이를 입력하면 접속하게 되는데 패스워드 입력없이 키를 이용한 방법은 아래에 작성해 놓았다.  

## ssh 서버의 포트를 바꾸는 방법
서버에 있는 설정파일을 수정해야한다.  
`/etc/ssh/sshd_config`파일을 수정한다.  
파일의 내용을 보다보면 `#Port 22`라는 행이 있을것이다.  
예를 들어 128번 포트로 변경하고 싶다면 이 행의 밑에 `Port 128`을 행 추가 해주자.  
클라이언트에서 접속할 때는 `ssh -p 128 유저아이디@서버주소`방식으로 접속하면 된다.  
   
## key를 사용한 접속 개요
공개키와 비공개키를 이용해 ssh접속을 만들어 낼 수 있다.  
1. 클라이언트에서 공개키와 비공개키 생성  
2. 서버의 키 목록에 클라이언트의 공개키 추가  
3. 클라이언트에서 서버로 접속

### 1. Key 생성하기: 클라이언트에서(리눅스 기준)
클라이언트에서 `ssh-keygen`을 실행하면 /home/userid/.ssh/ 폴더에 id_rsa와 id_rsa.pub 가 생긴다. 이때 전자가 비공개키, 후자가 공개키이다. 
아래의 명령을 통해 공개키를 서버로 복사하자.  
```
#server의 유저와 주소를 sshserver라고 가정함.
scp /home/userid/.ssh/id_rsa.pub sshserver@sshserver:/home/sshserver
```
  
### 2. 서버의 키 목록에 공개키 추가
옮겨받은 공개키의 내용을 서버의 /home/userid/.ssh/authorized_keys 파일에 추가하면 된다.  
userid가 sshserver라고 가정하면 아래의 명령어를 유용하게 사용할 수 있다.  
```
cat /home/sshserver/id_rsa.pub >> /home/sshserver/.ssh/authorized_keys
# >>을 사용해 cat 명령어의 출력을 다른곳으로 내보낸다.(파일에 추가시킴)
```
### 3. 접속:
확인해 보면 된다.  
추가로 ssh client에 여러개의 비공개키중 하나를 골라 사용하는 명령이 있다.(ssh 연결관계는 여러개가 될 수 있으므로)
```
ssh -i [비공개키 경로] ...
```



