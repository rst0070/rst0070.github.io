---
layout: post
categories: ["Java"]
title: "[Java] Iterator 사용법, 구현"
description: "Java Iterator의 사용법과 이를 이해하기위해 직접 구현을 해보자"
lastmod: 2022-04-09
---

1. Iterator의 의미
2. Iterator 사용법  
3. Iterator 만들어보기

## Iterator의 의미
java.util.Iterator는 자료구조의 요소에 접근하는 일관적 방법을 제공하기 위해 만들어진 인터페이스이다.  
따라서 Collection을 상속하는 모든 자료구조들은 `iterator()`함수를 통해 해당 객체에 대한 Iterator를 반환하도록 작성되어있다.  
  
이때 Map은 Key와 Value가 따로 있기 때문에 각각에 대한 Collection을 구한 뒤 Iterator를 구해야한다.  

# Iterator 사용법
Iterator는 3가지 함수를 제공한다.
- boolean hasNext(): Collection에 더 읽을 원소가 있는지 확인
- E next(): 다음원소를 읽어 반환
- remove(): next()로 참조한 원소를 삭제.  
  
# Iterator 만들어보기
Collection.iterator()을 구현해 보았다.  
익명클래스를 이용하여 Iterator객체를 만든다음 각 함수를 구현해주면 된다.  

<script src="https://gist.github.com/rst0070/9d00771a185e69703a25f318d0babad6.js"></script>