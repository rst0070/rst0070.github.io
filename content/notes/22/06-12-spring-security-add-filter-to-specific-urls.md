---
date: 2022-06-12
categories: ["Java"]
title: "[Spring Secutiry] 특정 url에 security filter 추가하기"
---
Spring Security를 이용해 개발을 하던 중 커스텀 필터를 특정 URL에 적용시킬 필요가 있었다. 
이 글에선 그 방법을 정리하려 한다.  
  
1. [URL패턴으로 요청 식별하기](#1-url패턴으로-요청-식별하기)
2. [필터추가하기](#2-필터-추가하기)
3. [코드](#3-최종코드)

## 1. URL패턴으로 요청 식별하기
`HttpSecurity`객체는 `antMatcher(String)`메서드를 제공한다. 
이를 통해 클라이언트의 요청중 특정 url pattern에 대한 설정을 할 수 있다.  
  
여러개의 url pattern에 대한 요청을 설정하고 싶은경우 아래와 같이 `HttpSecurity:requestMatchers()`를 통해 `antMatchers(String, String...)`을 이용하면 된다.  
```java
HttpSecurity
    .requestMatchers()
        .antMatchers(
            "pattern1....",
            "pattern2....",
            ...
        )
    .and()
    .....//설정
```  
## 2. 필터 추가하기
특정 요청을 선택했다면 그에 대한 필터를 추가해주면 된다.  
이때는 `HttpSecurity:addFilterBefore(Filter filterToAdd, Filter filterBefore)`메서드를 사용하면된다.  

이때 주의할것은 Spring Security에서 기본제공하는 필터들은 순서가 있다는 것이다. 이를 참고하여 어떤 위치에 커스텀 필터를 추가할 것인지 고려하자.  

필터의 순서는 [링크](https://docs.spring.io/spring-security/reference/servlet/architecture.html#servlet-security-filters)로 걸어두었다.  

## 3. 최종코드
```java
@EnableWebSecurity
public class SecurityConfigurer extends WebSecurityConfigurerAdapter {

    @Override
    public void configure(HttpSecurity http) throws Exception{

        http
                .requestMatchers()
                    .antMatchers(
                        "/review/add-review"
                        , "/place/add-place"
                    )
                .and()
                .addFilterBefore(
                        new MyCustomFilter(),
                        BasicAuthenticationFilter.class
                );
    }
}
```