---
layout: post
categories: ["FrontEnd"]
title: "CSS font 속성들과 속기형 작성법"
lastmod: 2022-04-09
---
CSS에서 font의 특성을 지정하는 속성들과 이를 빠르게 작성할 수 있는
속기형 작성법에 대해 정리하려 한다.  
- - -
## CSS에서 글자 스타일을 지정하는 속성들  
- 글꼴: font-family
- 크기: font-size
- 행간: line-height
- 기울기: font-style
- 두께: font-weight
- 음절 앞 글자 대문자: font-variant(영문 글꼴에만 적용)

*예시*
``` css
font-family: "Times New Roman";
font-size: 10px;
line-height: 1.5;
font-style: italic;
font-weight: bold;
font-variant: small-caps;
```
예시 처럼 각 속성들을 따로 지정할 수도 있지만, 속기형으로 빠르게 지정할 수 도 있다.  

- - -
## font 속기형 작성법  
font 속기형 작성법에는 필수 지정 요소들이 존재하며, 옵션 요소들의 경우 작성하는
방법이 존재한다.  

- 필수요소: *font-size* 와 *font-family*는 필수로 지정해야한다.
``` css
font: 10px "Times New Roman";
```
- 옵션요소: *line-height*를 지정할 때는 *font-size*뒤에 슬래시(/)를
붙이고 그 뒷부분에 작성한다.  
``` css
font: 10px/1.5 "Times New Roman";
```
- 옵션요소: *font-weight*, *font-style*, *font-variant*등은 *font-size*
앞부분에 작성한다.  
``` css
font: bold italic small-caps 10px/1.5 "Times New Roman";
```  
