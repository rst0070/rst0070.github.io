---
date: 2022-11-22
categories: ["Tools"]
title: "Jupyter Notebook에서 C++사용하기 (WSL사용)"
---
최근에 jupyter notebook을 처음사용해보고 '다른 언어 지원은 안하나?' 하는 생각에 이것저것 찾아보았다.  
결과는 [xeus-cling](https://github.com/jupyter-xeus/xeus-cling)을 통해 jupyter notebook에서 c++도 사용가능하다는것!  
근데 이것이 기본 윈도우는 지원하지 않는상태였다. 따라서 WSL을 이용해서 사용하는 방법을 찾아봤다. 대략적인 과정은 다음과 같다.  
  
1. wsl에 miniconda, jupyter notebook, xeus-cling 설치
2. notebook, 브라우저 설정
3. 스크립트 작성, 윈도우에 바로가기 만들기
  
## 1. Wsl에 Miniconda, Jupyter notebook, xeus-cling 설치
[https://docs.conda.io/en/latest/miniconda.html](https://docs.conda.io/en/latest/miniconda.html)
이 링크를 통해서 쉘 스크립트 파일을 받을 수 있으며 이를 wsl에서 실행하면 miniconda를 설치할 수 있다.  
  
```bash
#콘다 초기화 - 이후 터미널 껐다 켜주기
conda init

#패키지들을 저장할 작업공간 생성 - 구분 목적
#해당 작업공간으로 넘어가기
conda create -n clang
conda activate clang

# notebook, xeus-cling 설치
conda install notebook
conda install -c conda-forge xeus-cling
```

## 2. notebook, 브라우저 설정
원하는 폴더에 들어가서 `conda activate clang`을 하고 다음 명령을 실행하면 C++가 추가된 jupyter notebook이 실행된다.
```bash
jupyter notebook
```
  
이때의 문제점은 기본 윈도우 환경처럼 브라우저를 실행시킬 수 없다는것. 이것을 가능하게 하기위해 몇가지 설정이 더 필요하다.  
```bash
jupyter notebook --generate-config
```
위의 명령을 실행하면 notebook 실행 세부사항을 설정할 수 있는 python파일이 생성된다. 
나같은 경우는 `~/.jupyter/jupyter_notebook_config.py`에 생성되었다.  
이 파일에서 두가지를 설정해줘야한다.  

```python
# notebook 실행시 열 브라우저.
# 각자 자신이 사용하는 브라우저의 wsl상 경로를 입력하면 된다.
c.NotebookApp.browser = u'/mnt/c/Program\ Files\ \(x86\)/Google/Chrome/Application/chrome.exe %s'

# True로 해놓으면 WSL상의 특정파일로 브라우저를 실행시킨다.
# 이 파일은 redirection 용 파일이며 window에서는 해당 경로로 접근할 수 없다.
# False로 해놓으면 url을 전달
c.NotebookApp.use_redirect_file = False
```  
  
여기까지 설정을 마치면 `jupyter notebook`명령을 실행하면 정상적으로 브라우저가 실행될것이다.  
  
## 3. 스크립트 작성, 윈도우에 바로가기 만들기
먼저 wsl에 jupyter notebook을 실행시킬 스크립트를 만들어야한다. 이후 윈도우의 바로가기가 이 파일을 실행시킬것이다.  
  
나는 아래 내용을 WSL의 `~/jupyter_notebook.sh`파일로 저장했다.  
```bash
# notebook 실행위치
cd ~/notebook
# conda 실행, 작업공간
source ~/miniconda3/etc/profile.d/conda.sh
conda activate cpp
# notebook 실행
jupyter notebook
```

다음으로 바탕화면등에서 `마우스 오른쪽 클릭 > 새로만들기 > 바로가기`를 통해서 바로가기를 생성한다. 
바로가기의 타겟은 다음 처럼하면 된다.
```cmd
C:\Windows\System32\wsl.exe bash -c "source  /home/rst/jupyter_notebook.sh"
```
생성된 바로가기를 더블클릭하면 jupyter notebook이 실행되면서 웹브라우저가 실행될 것 이다.
![실행화면](/assets/notes/22/11-22/jupyter_notebook_cpp.png)