---
layout: post
tags: [css]
title: "CSS position: 기본위치, 상대위치, 절대위치, 고정위치"
---
css의 `position`속성에는 *static*, *relative*, *absolute*, *fixed*가 
있습니다.  
- - -  
## static
static은 모든 요소에 기본적으로 설정된 값입니다.  
  
- - -
## relative
relative 속성은 두가지 특징이 있습니다.  
1. relative 속성을 가진 요소가 원래 있던 공간을 다른 요소가 침범하지 못한다.
2. relative 속성을 가진 요소가 자신의 원래 위치를 기준으로 움직인다.  
  
*예시*
``` css
.example {
    position: relative;
    top: 5px;
    right: 4px;
}
```
위의 예시의 경우 *.example*은 원래자신의 위치중 오른쪽 위 꼭짓점을 기준으로 
아래로 5px, 왼쪽으로 4px 이동합니다.  
  
- - -  
## absolute
절대위치로 설정된 절대요소는 다음과 같은 속성을 갖게 됩니다.  
1. static 위치설정이 아닌 부모요소중 가장 가까운 부모를 기준으로 위치를 설정한다.
2. 절대요소 자신이 원래 위치해 있던 공간에 다른 요소가 침범할 수 있다.  
  
*예시*
``` css
.example {
    position: absolute;
    top: 5px;
    right: 5px;
}
```
- - -  
## fixed
고정위치로 설정된 고정요소들은 다음과 같은 속성을 갖게 됩니다.  
1. 고정요소 자신이 원래 위치하던 공간에 다른 요소가 침범할 수 있다.
2. 웹브라우저 화변을 기준으로 위치를 이동하며, 스크롤해도 고정되어있다.



