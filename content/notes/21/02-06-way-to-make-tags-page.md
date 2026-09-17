---
date: 2021-02-06
categories: ["Jekyll"]
title: "[Jekyll] tags 페이지 만들기"
lastmod: 2022-04-09
---
github page 블로그(jekyll)에 tag 페이지를 추가하는 방법을 정리했다.  
liquid언어로 페이지를 만드는 것이기 때문에 방법은 여러가지가 있으며 
나는 [지킬 홈페이지](https://jekyllrb-ko.github.io/docs/variables/)에 정의된 변수들을 사용하여 페이지를 만들었다. 

## 0. 전체적인 방법  
나는 `layouts`폴더에 tag.html 파일을 만들었다. 
이 파일을 layout으로 하는 markdown파일은 tag 페이지의 기능을 하게 된다.  

## 1. tag 페이지 구조 
- 상단: 블로그에 존재하는 모든 태그들을 나열한다.
- 중단: 각 태그별로 해당 태그가 걸린 게시물을 나열한다.
  
## 2. 구현 방법  
구현에 중심적으로 사용할 변수는 두가지 이다.
| 변수 | 의미 |
| --- | --- |
| `site.tags.TAG` | 사이트에 존재하는 모든 태그를 포함하는 리스트이다. |
| `site.tags.TAG.last` | 해당 태그를 가지는 모든 포스트를 참조하는 리스트이다. |
이외에도 링크나 포스팅된 날짜를 표시하기 위해 부가적인 변수를 사용할 것 이다.  
  
## 3. 구현
위의 변수와 for 문을 사용해서 간단히 구현 할 수 있다.
<script src="https://gist.github.com/rst0070/0ab68fc340cfe08f8150a6e6e149a688.js"></script>
