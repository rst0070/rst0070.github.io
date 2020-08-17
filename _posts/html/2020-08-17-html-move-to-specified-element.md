---
layout: post
categories: [html]
title: "HTML 위치 이동: 페이지 내의 특정 위치로 이동하기"
---
HTML 문서의 특정 element로 이동하는 방법입니다.  

### 1. 해당 Element의 id 혹은 name이 필요하다.
특정 element에 링크를 연결하기 위해선 id나 name을 사용해야 합니다.  
링크에서는 `#id`, `#name`과 같은 방법으로 접근합니다.  

### 2. 1의 Element를 가리키는 링크를 사용한다.
id나 name을 사용하여 특정 element를 가리키는 링크를 만들 수 있습니다.  
``` html
<a href="#link">link to link</a>

<a name="link" href="#pp">link to pp</a>

<p id="pp">hi</p>
```  
현재 페이지가 아닌 외부페이지에 접근할때도 위의 방식을 사용할 수 있습니다.  즉, url뒤에 붙여 사용가능.  

### 기타: name이나 id가 중복된 경우에는?

1. 같은 name을 가진 element가 여러개인 경우  
상대적으로 문서의 위쪽에 있는 element가 연결된다.  

2. name과 id가 같은 경우  
아래와 같은 상황에선 a tag가 p element를 연결한다.  

``` html
<a href="#element">link</a>

<input name="element"/>

<p id="element"/>
```
  

