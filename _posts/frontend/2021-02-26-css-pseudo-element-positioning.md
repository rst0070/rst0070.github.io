---
layout: post
tags: ['css', 'html']
title: "css 가상요소: after , before 요소 위치지정하기"
---
가상선택자 after, before 엘리먼트가 사라지는 현상을 해결하고 그 방법을 작성한 글이다. after, before 엘리먼트의 위치지정 방법을 정리했다.  
  
결론 부터 말하자면 아래와 같다.
1. 위치를 지정하기 위해서는 대상 엘리먼트, after, before 모두의 스타일이 `position: absolute`여야 한다.
2. after, before 가상요소는 `content`속성이 지정되어야한다.
3. after, before는 그 기준인 엘리먼트를 기준으로 위치가 지정된다.
4. 위치 지정시 `top`, `left`와 `transform: translate()`는 같은 효과를 가진다.  
  
이제 하나씩 설명하겠다.  
# 1. 대상 엘리먼트와 after, before 엘리먼트는 `position: absolute;`여야 한다. 
위의 전제조건이 있어야 다음단계(위치지정)로 넘어갈 수 있다.  
앞으로 사용할 코드이다.
```html
----------html----------
<div id="parent">
    <div id="base"></div>
</div>
----------css-----------
#base { position: absolute;}
#base::before, #base::after {position: absolute;}
```
 
# 2. after, before 가상요소는 `content`속성이 지정되어야한다.
1번과 마찬가지로 전제조건이다. 즉 after와 before에`content:""` 라도 명시해줘야한다.  

# 3. 가상요소(after, before)는 대상엘리먼트를 기준으로 위치가 지정된다.
즉 코드에서 `#base::after`와 `#base::before`요소는 `#parent`가 아닌 `#base`를 기준으로 위치가 지정된다.
```html
<div id="parent">
    <div id="base"></div>
</div>
-----------css-------
#base { position: absolute;}
#base::before {
    position: absolute;
    top: 20px;
}
```
따라서 위처럼 스타일을 지정하면 `#base::before`는 `#base`로 부터 20px 아래에 위치한다.  
  
# 3. 가상요소(after, before)에서 top, left는 traslate와 같은 효과이다.
즉 위에서 언급한 가상요소의 스타일 `top: 20px; left:30px`는 `transform: translate(20px, 30px);`와 같다.
