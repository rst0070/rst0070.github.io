---
layout: post
title: "[HTML5] Outline과 Section"
categories: ["FrontEnd"]
lastmod: 2022-04-09
---
 - 이 글은 [MDN문서](https://developer.mozilla.org/ko/docs/Web/HTML/HTML5_%EB%AC%B8%EC%84%9C%EC%9D%98_%EC%84%B9%EC%85%98%EA%B3%BC_%EC%9C%A4%EA%B3%BD)와 [M5 design studio](https://m5designstudio.com/2013/orlando-web-design/html5-for-beginners-2)를 참고하여 작성한 글 입니다.
 - [HTML5 Outliner](https://gsnedders.html5.org/outliner/)을 이용하면 아웃라인을 확인할 수 있습니다.  
 
# Outline  
 HTML5에서는 이전보다 파악하기 쉬운 아웃라인을 사용합니다. 
아웃라인은 '섹션의 계층구조(트리구조)'라고 이해할 수 있습니다.  

# Section
 HTML5에서는 명시적인 방법과 비명시적인 방법으로 문서를 부분(section)으로 나눌수 있습니다.  
 
## 명시적 섹션
아래의 태그들을 사용합니다.
![dd](https://m5designstudio.com/wp-content/uploads/2013/01/HTML5_website_structure.jpg)
`<body>`도 섹션 태그입니다. 각 섹션은 제목(`<h1>`부터`<h6>`)을 가질 수 있으며 제목은 섹션내의 가장 위에 위치한 태그만 해당합니다. 그 외의 제목태그들은 뒤에서 설명할 비명시적인 섹션을 만들어냅니다.  
```html
<body>
    <h1>body</h1>
    <section>
        <h1>body-s</h1>
        <section>
            <h1>body-s-s</h1>
        </section>
    </section>
    <section>
        <h1>body-s-2</h1>
    </section>
</body>
```
위 코드는 아래의 아웃라인을 갖게됩니다.
```
1. body
    1. body-s
        1. body-s-s
    2. body-s-2
```
이를 통해 섹션으로 계층구조가 나눠짐을 알 수 있습니다. 
하지만 `<aside>`,`<nav>`,`<header>`,`<footer>`태그는 웹문서의 주요 아웃라인에 속하지 않습니다. 즉, 이 태그들은 해당 html5 문서의 주요 맥락에서 벗어난 내용을 다루는 용도로 사용됩니다.
## 비명시적 섹션
제목 태그(`<h1>`부터 `<h6>`)는 자신이 속한 섹션의 첫번째 제목으로 정의되지 않았다면 비명시적(암묵적)으로 새로운 섹션으로 분류됩니다.

