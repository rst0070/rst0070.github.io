---
date: 2022-11-23
categories: ["Algorithm"]
title: "1인 bit의 수를 빠르게 세는 방법은? - Brian Kernighan’s Algorithm"
---
어떻게 interger type의 변수에서 켜져있는 bit를 빠르게 counting 할 수 있을까? 아무리 생각해봐도 잘모르겠어서 인터넷을 검색해봤다.  
  
__참고자료__  
* [geeks for geeks](https://www.geeksforgeeks.org/count-set-bits-in-an-integer/)
* [stackoverflow](https://stackoverflow.com/questions/109023/count-the-number-of-set-bits-in-a-32-bit-integer?page=1&tab=scoredesc#tab-top)  
  
위 자료를 보면 여러가지 알고리즘이 소개되어있는데 그중에 한가지만 제대로 이해해서 그 내용만 정리하려한다.  
  
## Brian Kernighan’s Algorithm
이 알고리즘은 n과 n-1의 관계를 통해 효율적으로 1인 bit의 개수를 센다.  
예시로 10부터 1까지를 보면 아래의 binary값으로 표현할 수 있다.  
이때의 특징은  
* 짝수를 -1하면 맨 오른쪽의 연속된 0들이 1로 되고 처음 나오는 1이 0이 된다.
* 홀수를 -1하면 2^0자리만 0이 된다.


```c++
#include <iostream>
#include <bitset>

int n = 10;
while(n >= 0){
    std::cout << std::bitset<4>(n) << "\n";
    n--;
}
```

    1010
    1001
    1000
    0111
    0110
    0101
    0100
    0011
    0010
    0001
    0000


위의 특징을 통해 알 수 있는건 `n & (n-1)`연산을 재귀적으로 한다면 bit를 한 개씩 0으로 만드는 효과를 볼 수 있다는것이다.  
즉 총 1인 bit의 개수만큼만 연산을 할 수 있다는 것 이다. 아래의 코드가 알고리즘의 구현 


```c++
n = 10;
int count = 0;
while(n > 0){
    count += 1;
    n = n & (n-1);
}
std::cout << count << std::endl;
```

    2

