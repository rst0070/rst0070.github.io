---
date: 2022-04-08
categories: ["Jekyll"]
title: "[Jekyll, Github Page] 카테고리 페이지 만들기"
description: "Jekyll liquid variable을 활용해 Github 블로그에 카테고리 페이지를 추가하는 방법."
lastmod: 2022-04-09
---
Github 블로그 포스팅을 정리하던중 카테고리 페이지의 필요성을 느꼈다.  
[Jekyll Docs](https://jekyllrb.com/docs/variables/)에 설명되어있는 변수들을 잘 이용하면 카테고리 페이지를 만들수 있다!  
아래의 순서로 만들어보았다.  

1. Post에서 카테고리를 지정, 보여주기
2. 카테고리별 페이지 만들기
3. 전체 카테고리 리스트를 보여주는 페이지 만들기  
  
코드의 이해를 돕기위해 상황을 가정해보자.  
git에 대한 포스팅을 작성하는데 이 포스팅을 카테고리로 분류하고 싶은상황이다.  
git은 개발도구이므로 `Tools`와 `Git`카테고리를 만들기로했으며 `Tools`카테고리 안에 `Git`카테고리가 포함되도록 만들어야한다.  

## 1. Post에서 카테고리 지정하기, 페이지에 카테고리 표시하기
### 1.1 카테고리 지정하기
[FrontMatter](https://jekyllrb.com/docs/front-matter/)에서 지정할 수 있는 `categories`라는 변수를 이용한다. 
(FrontMatter는 Jekyll에 페이지의 Metadata를 알려주는 역할을 한다.)  
문자열 혹은 배열의 형태로도 지정이 가능하다.  
필자는 배열로 카테고리를 지정했으며 배열원소의 순서를 이용해 카테고리의 상하관계를 나타냈다.  
```liquid
---
layout: post
categories: ["Tools", "Git"]
title: "Git 외부 저장소 연결하기"
---
...포스팅 내용
```  
### 1.2 카테고리 정보를 페이지에서 보여주기
위의 post는 `post`라는 layout을 가진다.  
해당하는 `/_layouts/post.html`레이아웃에 아래의 코드를 추가해주자

```html
<div>
  {% for category in page.categories % }
    <a href="{{ site.url }}/category/{{ category }}.html" >{{ category }}</a>
  {% endfor %}
</div>
```

`page.categories`변수를 이용해 포스팅에서 지정된 카테고리의 링크를 보여주도록 만들었다. 
가정한 상황에선 `../category/Tools.html`, `../category/Git.html`링크가 보여질것이다. 

## 2. 카테고리별 페이지 만들기
앞에서 카테고리 페이지에 접근할 수 있게 만들었으니 이번에는 카테고리 페이지를 만들자. 
### 2.1 카테고리별 페이지
`/category/Tools.html`  
```
---
layout: category
categories: ["Tools"]
title: "Tools"
---
```
`/category/Tools-Git.html`  
```
---
layout: category
categories: ["Tools", "Git"]
title: "Tools/Git"
permalink: /category/Git.html
---
```
위의 `permalink`는 페이지의 url을 지정해준다. 파일명을 카테고리 구조에 맞게 작성했기때문에 추가해주었다.  

### 2.2 category layout
여러개의 카테고리가 있을것이기 때문에 `category`라는 레이아웃을 지정했는데 이것도 만들어야한다.  
`/_layouts/category.html`에 만들어주자

```html
---
layout: default
---
<h1>
  {{ page.title }}
</h1>
{{ content }}
<ul class="posts">
  {% assign categories = page.categories | join: "-" %}
  {% for post in site.posts %}
    {% assign postCategories = post.categories | join: "-" %}
    {% if categories == postCategories %}
      <li>
        <a href="{{ site.baseurl }}{{ post.url }}">{{ post.title }}</a>
      </li>
    {% endif %}
    
  {% endfor %}

</ul>
```

[join 필터](https://selosele.github.io/liquid/filters/join/)를 사용하여 카테고리 페이지의 `categories` 배열을 문자열화 시키고
사이트의 모든 포스트들을 확인하며 각 포스트의 `categories`배열을 문자열화 시켜서 두 값이 같은지 비교하는 방식이다.  

이 방법을 이용해 `categories`배열이 완전히(원소의 순서까지) 같은 경우에만 해당 카테고리에 해당하는 경우로 처리할 수 있다.   

## 3. 카테고리 리스트 만들기.
카테고리 리스트 또한 사이트 변수등을 이용해서 만들 수 있지만 
필자의 경우 카테고리간 상하관계를 구현하기 복잡해서 직접구현했다.  
`/menu/category.html`  
```
<ul class="category-list">
  <li>
    <a href="{{ site.url }}/category/Oracle.html">Oracle</a>
  </li>
  <li>
    <a href="{{ site.url }}/category/Tools.html">Tools</a>
    <ul>
      <a href="{{ site.url }}/category/Git.html">Git</a>
    </ul>
  </li>
</ul>
```