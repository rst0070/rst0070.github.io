---
date: 2022-09-26
categories: ["Algorithm", "BOJ"]
title: "[백준 교수님은 기다리지 않는다 3830번 C++] Union Find이용 풀이"
---

1. 문제
2. 알고리즘
3. 코드
  
- - -
## 1. 문제  
[문제링크](https://www.acmicpc.net/problem/3830)  
문제의 핵심은..  
어떤 두 샘플의 무게차이를 여러번 알려줬을때  
그 정보들을 활용해서 임의의 두 샘플의 무게차이를 알 수 있느냐 이다.  
  
## 2. 알고리즘
만약 무게차이 관계를 간선으로한 그래프를 만든다 했을때, 어떤 두 샘플의 무게 차이를 알기 위해선 두 샘플이 같은 그래프에 속해 있어야한다.  
또한 모든 무게차이를 그래프로 기록할 필요가 없다.  
트리 형태로 만들어 루트와의 무게차이만 기록하면 된다. 이를 통해서 한 트리내의 모든 무게차이를 구할 수 있다.  
  
이러한 형태로 자료구조를 구성하기 위해서 유니온 파인드를 사용하면 된다.  
주의할 점은 두가지 이다.  
  
* find - find시 속도 향상을 위해 자신의 parent를 tree의 root로 저장한다. 또한 find시 parent와 루트의 무게차이를 이용해 자신과 루트의 무게차이를 갱신한다.
* union - 유니온시 두 샘플의 루트를 찾아내고 루트간의 무게차이를 기록하고 루트간에 child-parent관계를 만든다. 이때 약간의 수학적 연산 필요

## 3. 코드
```c++
#include <iostream>

/** 자신의 root로 부터 얼만큼 무거운지 나타낸다. */
int W[100001];
/** 자신의 root 혹은 parent를 나타냄*/
int root[100001];
/** test case 마다 data 초기화*/
void initData(int n){
    for(int i = 1; i <= n; i++){
        W[i] = 0;
        root[i] = i;
    }
}
/**
 * find시 parent의 W(parent와 root의 무게차이)를 먼저 갱신 시켜서
 * 해당 node와 parent의 무게 차이에 더한다.
 */
int findRoot(int node){
    if(node == root[node]) return node;

    int r = findRoot(root[node]);
    W[node] += W[root[node]];

    return root[node] = r;
}

/**
 * @brief union function
 * a - a_root_w = W[a]
 * b - b_root_w = W[b]
 * b - a = weight
 * b - a + a_root_w - b_root_w = W[b] - W[a]
 * a_root_w - b_root_w = W[b] - W[a] - weight
 * b_root_w - a_root_w = W[a] - W[b] + weight
 * 위 관계를 이용해 a와 b의 루트들을 연결한다.
 * 이때 샘플번호가 작은것이 루트가 된다.
 * @param a 
 * @param b 
 * @param weight - a보다 b가 얼마나 무거운지
 */
void mergeW(int a, int b, int weight){
    int root_a = findRoot(a);
    int root_b = findRoot(b);

    if(root_a == root_b) return;

    if(root_a < root_b){
        root[root_b] = root_a;
        W[root_b] = W[a] - W[b] + weight;
    }else{
        root[root_a] = root_b;
        W[root_a] = W[b] - W[a] - weight;
    }
}

int main(){
    std::ios_base::sync_with_stdio(false); std::cin.tie(NULL);

    int n, m, a, b, c, d;
    char order;

    std::cin >> n >> m;
    while(n != 0 || m != 0){

        initData(n);

        while(m-- > 0){
            std::cin >> order;
            if(order == '!'){
                std::cin >> a >> b >> c;
                mergeW(a, b, c);
            }else{
                std::cin >> a >> b;
                if(findRoot(a) == findRoot(b)){//무게 차이 찾을 수 있을때.
                    std::cout << W[b] - W[a] << '\n';
                }else{
                    std::cout << "UNKNOWN\n";
                }
            }
        }

        std::cin >> n >> m;
    }
}

```