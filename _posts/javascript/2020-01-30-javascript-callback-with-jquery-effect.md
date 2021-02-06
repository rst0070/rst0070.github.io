---
layout: post
title: "[Javascript] Callback 함수 with JQuery effect"
tags: [javascript, jquery]
---

<script src = "https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>

## 배경
javascript는 한 문장씩 순차적으로 실행되는 언어이다.
하지만 애니메이션등의 효과를 사용하게되면 효과를 모두 마치기 
전에 다음 문장이 실행됨을 볼 수 있다.  
다음의 코드를 실행시켜보면 쉽게 이해할 수 있다.  
``` html
<button id = "click">click</button>
<p id = "pp">저는 알림이 뜨기전에 사라지고 싶어요</p>
<script>
    $("#click").click(
        function(){
            $("#pp").slideUp("slow");
            alert("어림도 없지!");
        }
    );
</script>
```  
<div style = "border-style: solid; border-color: green;">
<button id = "click">click</button>
<p id = "pp">저는 알림이 뜨기전에 사라지고 싶어요</p>
</div>
<script>
    $("#click").click(
        function(){
            $("#pp").slideUp("slow");
            alert("어림도 없지!");
        }
    );
</script>

이러한 문제는 애니메이션 효과뿐만이 아니라
javascript를 사용하는 여러순간에 발생할 수 있다.
이를 해결하기 위해 Callback기능을 이용한다.  

## 사용방법
애니메이션 효과의 경우 다음과 같은 형식으로 사용할 수 있다.  
`$(selector).effect(speed, callback)`  
- effect는 slideUp, hide와 같은 효과 함수들을 가리킨다.
- callback은 함수이다. 효과가 다 끝나고 함수가 실행된다.  
아래의 예시를 실행해보자  

``` html
<button id = "click">click</button>
<p id = "pp">저는 알림이 뜨기전에 사라지고 싶어요</p>
<script>
    $("#click").click(
        function(){
            $("#pp").slideUp("slow",
            function(){
                alert("그렇게 하렴~");
            });
            
        }
    );
</script>
```

<div style = "border-style: solid; border-color: green;">
<button id = "clickk">click</button>
<p id = "pppp">저는 알림이 뜨기전에 사라지고 싶어요</p>
</div>
<script>
    $("#clickk").click(
        function(){
            $("#pppp").slideUp("slow",
            function(){
                alert("그렇게 하렴~");
            });
        }
    );
</script>  
  
## 마치며, 새롭게 알게된점
javascript의 callback함수를 '애니메이션 효과'에 관련된 부분의 공부를 하면서 '순차적 실행'에 관련해서만 이해했었다. 하지만 조금더 깊게 공부를 해보니 
`$(selector).click(function(){...})` 과 같은 jquery 구문도 callback을 
이용한다는 사실을 알게되었다.  
 
자바스크립트에서는 함수가 객체로 사용된다.
함수1이 함수2를 파라미터로 받고 실행중 혹은 실행 마지막( 애니메이션 효과가 끝날때 
처럼 )에서 함수2를 실행시킨다면 함수2를 콜백함수라고 할 수 있다.  
   
이러한 개념은 함수형 프로그래밍의 개념이라는데 좀 더 찾아봐야겠다.
 
