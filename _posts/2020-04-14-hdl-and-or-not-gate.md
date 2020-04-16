---
layout: post
tag: [logicgate, hdl]
title: "HDL: nand gate를 사용해 and, or, not gate 만들기"
---
## HDL 기본  

[Hardware Description Language](https://ko.wikipedia.org/wiki/%ED%95%98%EB%93%9C%EC%9B%A8%EC%96%B4_%EA%B8%B0%EC%88%A0_%EC%96%B8%EC%96%B4)의 줄임말인 HDL은 칩을 설계하고 테스트하기 위한 언어입니다.  
기본단위는 칩이며 이 칩들은 input pin과 output pin을 갖지며 내부적인 연산을 통해 input에서 output으로 boolean
형식의 데이터가 이동하게 됩니다.  
 이때 내부적인 연산은 다른 칩들에 intput을 넣고 output을 받는 과정으로 이루어집니다.
즉 input과 output만을 이용하여 설계해야합니다.  

예시로 아래의 Nand 칩을 설계해 보겠습니다.  

``` hdl
CHIP Nand{
  //IN에서는 input pin들을 정의
  IN x, y;
  //OUT에서는 output pin을 정의
  OUT ret;

  /* 이때 배열의 형태로 pin들을 정의할 수 있다.
   * 위의 x, y 대신 x[2]로 하여 x[0]와 x[1]으로 각 pin원소를 접근할 수 있다.
   * output pin도 마찬가지로 정의가능
   */

  //PARTS에서는 처리할 내용을 작성한다.
  PARTS:
  And(a = x, b = y, out = o1);
  Not(in = o1, out = ret)

  /* 다른칩에 접근할때는 '칩이름(핀이름 = 현재핀에서사용하는핀)'식으로
   * 접근한다.
   * input pin에 접근하는 pin은 값을 전달,
   * output pin에 접근하는 pin은 값을 받아온다.
   * ex. Nand(x = a, y = b, ret = out);
   *
   * 이때 out에 해당하는 핀에 internal pin을 연결할 수 있다.
   * 예를들어 위의 'o1'이 internal pin인데 여러 칩들을 연결할때
   * output의 이름을 붙여주는 역할을 한다.
   */
}
```

## Not gate
not gate는 input을 반전 시켜 output으로 출력합니다.

| a | not(a) |
| :---: | :---: |
| 0 | 1 |
| 1 | 0 |  

``` hdl
CHIP Not{
    IN in;
    OUT out;

    PARTS:
    Nand(a = in, b = in, out = out);
}
```

## And gate
and gate는 두 input이 모두 1 일때만 1을 출력합니다.  

| a | b | and(a, b) |
| :-: | :-: | :-: |
| 0 | 0 | 0 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |  

``` hdl
CHIP And{
    IN a, b;
    OUT out;
    PARTS:
    Nand(a = a, b = b, out = notAnd);
    Nand(a = notAnd, b = notAnd, out = out);
}
```
## Or gate
or gate는 입력 a, b중 하나라도 1이면 1을 출력합니다.  

| a | b | or(a, b) |
| :-: | :-: | :-: |
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 1 |  

이를 Nand gate만으로 만들기 위해 [드모르간의 법칙](https://ko.wikipedia.org/wiki/%EB%93%9C_%EB%AA%A8%EB%A5%B4%EA%B0%84%EC%9D%98_%EB%B2%95%EC%B9%99)을 사용할 수 있습니다.  
즉 `a + b = ~a * ~b`(+: or, *: and)  
``` hdl
CHIP Or{
    IN a, b;
    OUT out;
    PARTS:
    Nand(a = a, b = b, out = nota); //  ~a
    Nand(a = b, b = b, out = notb); //  ~b
    Nand(a = nota, b = notb, out = o1); //  ~(~a*~b)
    Nand(a = o1, b = o1, out = out);    //  ~(~(~a*~b))
}
```
