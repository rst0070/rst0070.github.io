---
layout: post
categories: ["FrontEnd"]
title: "[CSS display속성] block, inline, inline-block 알아보기"
lastmod: 2022-04-09
---
HTML element는 크게 Block element와 Inline element로 나뉜다.  
이 둘의 특징과 inline-block요소에 대해 알아보자.  

## Block element 특징
1. 왼쪽이나 오른쪽에 다른 element가 오지 못한다. 즉 하나의 가로줄을 block element가 차지한다.
2. css의 width, height 속성을 그대로 표현한다. 해당 element가 포함한 내용이 없거나, 작거나, 크거나 이는 변하지 않는다.
  
## Inline element 특징
1. 왼쪽이나 오른쪽에 다른 element가 올 수 있다.
2. 해당 element가 포함한 내용에 따라 element의 크기가 결정된다. 즉 css 속성(width, height)은 영향을 주지 않는다.  
  
## Inline-block element 특징
1. 왼쪽이나 오른쪽에 다른 element가 올 수 있다.
2. css의 width, height 속성을 그대로 표현한다. 해당 element가 포함한 내용이 없거나, 작거나, 크거나 이는 변하지 않는다.
즉 화면 배치는 inline이지만 크기는 block인 것이다.  
   
위의 속성들은 모두 css를 통해 직접적으로 element에 적용이 가능하다.  
[예시](https://codepen.io/rst0070/pen/XWNdJWB)를 통해 확인할 수 있다.