---
date: 2022-06-02
categories: ["Java"]
title: "[Spring boot] Mock 테스트 하기"
---
스프링 부트를 이용한 웹애플리케이션에 http요청을 테스트하는 방법은 크게 3가지로 생각할 수 있다.  
1. 웹애플리케이션을 서버위에서 구동시켜 http요청을 보내보며 테스트
2. 애플리케이션을 실제 서버위에서는 구동시키지 않지만 spring context를 이용해 http요청을 전달하여 테스트  
3. 애플리케이션의 일부만 작동시켜 테스트

이 글은 2번째 방법을 정리했으며 [스프링 공식문서를 참고했다.](https://spring.io/guides/gs/testing-web/)  
  
## 1. Spring Application Context 실행시키기.  
테스트 코드에서 Spring의 Controller, Service등 `bean`들을 테스트하기 위해선 `Spring Application Context`를 실행시키고 접근할 수 있어야한다.  

테스트 클래스에 `@SpringBootTest`을 추가해주면 해당 클래스에선 `Spring Application Context`에 대한 작업을 진행할 수 있다.  
이 어노테이션은 `@SpringBootApplication`처럼 Spring에게 어노테이션이 적용된 클래스가 main configuration임을 알려준다.  

이를 통해서 다음의 코드와 같이 `bean`을 가져와 테스트 해 볼 수 있다.
```java
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
public class TestingWebApplicationTest {

    @Autowired
    SomeBean someBean;

    @Test
    public void test1(){
        assertEquals(someBean........);
    }
}
```

## 2. MockMvc - Http요청을 실행
Http요청을 spring application에 테스트해보기 위해선 http요청을 실행할 무언가가 필요하다.  
이 무언가의 역할을 하는것이 스프링에서 제공하는 `MockMvc`객체이다.  

이 객체는 테스트 클래스에 `@AutoConfigureMockMvc`를 추가하여 `@Autowired`로 얻을수 있다.  
예시는 아래와 같다.
```java
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

@SpringBootTest
@AutoConfigureMockMvc
public class TestingWebApplicationTest {

	@Autowired
	private MockMvc mockMvc;

    @Test
    public void test1() throws Exception{
        mockMvc.perform(
             MockMvcRequestBuilders
                                .get("/login")// -> org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder반환
                                .header("Authorization", "Basic " + new String(Base64.getEncoder().encode("user1:password1".getBytes(StandardCharsets.UTF_8))))
            )//--> org.springframework.test.web.servlet.ResultActions반환
                .andExpect(
                    MockMvcResultMatchers.content()......                
                );
    }
}
```  
예시 코드처럼 
`org.springframework.test.web.servlet.request.MockMvcRequestBuilders`  
`org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder`  
`org.springframework.test.web.servlet.result.MockMvcResultMatchers`  
`org.springframework.test.web.servlet.ResultActions`등의 클래스를 활용하여 테스트 할 수 있다.