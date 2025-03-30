---
layout: post
categories: ["Java"]
title: "[Jackson] JsonNode를 이용한 json 읽기, 쓰기"
lastmod: 2022-06-17
description: "JsonNode 소개 및 생성방법. JsonNode 수정방법. JsonNode에서 Object, Collection등으로 변환방법. JsonNode에서 Json문자열로 변환방법."
---
1. [JsonNode소개 및 생성하기](#1-jsonnode소개-및-생성하기)
2. [JsonNode 수정하기](#2-jsonnode-수정하기)
3. [JsonNode to Object, Collection](#3-jsonnode-to-object-collection)
4. [JsonNode에서 Json문자열로](#4-jsonnode에서-json문자열로)

## 1. JsonNode소개 및 생성하기
[Jackson 문서](https://fasterxml.github.io/jackson-databind/javadoc/2.7/com/fasterxml/jackson/databind/JsonNode.html)에 따르면 json tree구조를 가진 객체라고 한다.  
즉 json문서의 전체 혹은 일부를 나타낼 수 있는 객체이다.  
  
이 클래스의 서브 클래스들이 있는데 JsonNode의 역할을 세분화한 버전이라고 생각하면 된다. `com.fasterxml.jackson.databind.node`패키지에서 확인 할 수 있다.  


__json 문자열로 생성하기__  
```java
String json = "{\"property1\":\"value1\", \"property2\":\"value2\", \"property3\":\"value3\",}";
ObjectMapper mapper = new ObjectMapper();
JsonNode node = mapper.readTree(json);
//다양한 파라미터 타입에 대한 readTree 메소드가 존재한다.
```
__빈 객체 생성하기__  
```java
ObjectMapper mapper = new ObjectMapper();
JsonNode node = mapper.createObjectNode();
```
__Object to JsonNode__  
```java
Student student = new Student();//String name, int grade 필드를 가진 객체라 가정
student.setName("김원빈");
student.setGrade(2);

ObjectMapper mapper = new ObjectMapper();
JsonNode node = mapper.valueToTree(student);
//{"name":"김원빈", "grade":"2"}
```  

## 2. JsonNode 수정하기  
JsonNode자체는 수정을 지원하지않는다. 따라서 서브 클래스중 하나인 `ObjectNode`를 이용해 수정할 수 있다.  
[ObjectNode 문서](https://fasterxml.github.io/jackson-databind/javadoc/2.7/com/fasterxml/jackson/databind/node/ObjectNode.html)  
```java
JsonNode jsonNode = ......;
((ObjectNode)jsonNode).put("grade", "3");
```

## 3. JsonNode to Object, Collection
__JsonNode to Object__  
`ObjectMapper:treeToValue(TreeNode, Class<T>)`를 사용한다.  
```java
ObjectMapper mapper = new ObjectMapper();
Student student = mapper.treeToValue(jsonNode, Student.class);
```
__JsonNode to Collection__  
ObjectReader를 생성하여 사용한다.  
```java
ObjectMapper mapper = new ObjectMapper();
//Class<T>나 JavaType을 파라미터로 받는 메소드도 있음
ObjectReader reader = mapper.readerFor(new TypeReference<List<String>>(){});
List<String> value = reader.readValue(jsonNode);//jsonNode는 JsonNode객체
```

## 4. JsonNode에서 Json문자열로
`JsonNode:toString()`혹은 `JsonNode:toPrettyString()`을 사용하면된다.  
두가지 방법의 차이점은 후자가 보기 편한 형태의 문자열로 만들어준다는것.  
