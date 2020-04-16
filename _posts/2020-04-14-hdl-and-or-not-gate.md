---
layout: post
tag: [logicgate, hdl]
title: "HDL: nand gate를 사용해 and, or, not gate 만들기"
---
## HDL 기본
[HardwareDescriptionLanguage]()의 줄임말인 HDL은 
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

