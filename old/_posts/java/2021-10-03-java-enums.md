---
layout: post
categories: ["Java"]
title: "[Java] Enum, 열거형이란? 실체를 구현해보자"
description: "Java enum 열거형이 무엇인지 알아보고 실체를 구현해보자"
lastmod: 2022-04-09
---
### 목차
1. Enum의 의미
2. Enum 선언 및 사용 방법
3. Enum의 실체
4. Enum 구현해보기

## 1. Enum의 의미
Enum은 열거형 이라는 의미이며 일반적으로 관련된 상수를 묶어주는 역할을 한다.  
Java의 열거형은 위 특징에 추가되는 '타입 체크'기능이있으므로 
크게 아래 두가지의 역할을 한다고 할 수 있다.  

1. 비슷한 상수들을 타입으로 묶는 기능
2. 묶인 타입별로 구분하는 기능.

이외에도 정의된 순서를 구하거나 이름을 구하는등 기능이 있지만 위 두가지 기능만 보겠다.  

## 2. Enum선언하기, 사용하기

### 2.1 타입구분 기능.
enum은 아래와 같이 선언하고 사용하며, 값이 같더라도 타입이 다르면 다른 상수로 인식한다.
``` java
enum Color1 { RED, ...}
enum Color2 { RED, ...}
System.out.println(Color1.RED == Color2.RED);// => false
```
### 2.2 각 enum에 생성자 부여하기
각 enum이 값을 가지게 할 수 있는데 이때는 생성자가 필요하다.  
이때 생성자는 자동적으로 private만 가능하게 되어 외부에서 사용할 수 없다.  

생성자 뿐만아니라 다른 메소드, 변수등도 내부적으로 선언할 수 있어 각 enum이 지니게 할 수 있다.
``` java
enum Color{
    RED("red"), GREEN("green"), BLUE("blue");

    String name;
    
    Color(String name){
        this.name = name;
    }
    
    String getName(){return name;}
}
```

## 3. Enum의 실체 및 구현하기
앞의 내용을 보면 enum의 정체가 무엇이길래 생성자등을 가질 수 있는지 의문이 생길 것 이다.  
enum에 대한 사실을 나열해보면  
1. 모든 enum은 java.lang.Enum을 상속받는다.  
2. 따라서 모든 열거형은 객체이다.
3. 타입클래스는 자신의 열거형 객체들을 static final 로 참조하고있다.
  
위의 특징들을 통해 java enum은 임의로 값을 지정할 수 있으며 타입체크가 가능한 것 이다. 
따라서 Enum은 아래의 클래스와 같은 동작을 하는것이다.  
```java
class Color{
    static final Color RED = new Color("red");
    static final Color GREEN = new Color("green");
    static final Color BLUE = new Color("blue");

    String name;
    private Color(String name){
        this.name = name;
    }
}
```
물론 실제 Enum의 기능을 훨씬 축소시키고 상속도 구현하지 않았지만 
Enum이 어떤 방식으로 가능한 것인지 구현해보았다.
