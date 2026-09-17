---
date: 2020-12-06
categories: ["Algorithm"]
title: "알고스팟 WILDCARD 동적계획법 풀이"
lastmod: 2022-04-09
---

## 문제
[링크](//https://algospot.com/judge/problem/read/WILDCARD)  
링크에 설명돼 있는것 같이 와일드카드는 다양한 이름의 파일을 *와 ?를 이용해서 표현한 문자열이다. 
와일드카드와 맞는 문자열들을 골라내는것이 이 문제의 핵심이다.  
어려운점은 `*`와 문자열을 비교하는 것이다. 무수하게 많은 경우의 수가 발생 할 수 있기 때문이다.

## 풀이 과정
일단 완전 탐색으로 생각해보자.
와일드카드 `w`와 파일 이름 `s`가 주어질때 s가 w와 맞는지 확인해보는 함수를 만들어본다.  
``` c++
bool isMatched(string w, string s){
    //마지막까지 다른것이 없을
    if(w.length() == 0 && s.length == 0) return 1;

    if((w[0] == '?' && s.length() > 0) || w[0] == s[0]) return isMatched(w.substr(1), s.substr(1));
    if(w[0]=='*') return isMatched(w.substr(1), s) || isMatched(w, s);
    
}
```



## 코드
``` c++
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

int memo[101][101];
string wildCard, str;
void initialize(){
    for(int i=0; i < 100; i++)
        for(int j=0; j < 100; j++)  memo[i][j] = -1;
}
//i: wildCard에 대한 포인터, j: 주어진 문자열에 대한 포인터
bool solve(int i, int j){
    if(i == wildCard.length() && j == str.length()) return 1;
    
    int & m = memo[i][j];
    if(m != -1) return m;
    
    if(i < wildCard.length() && j < str.length() &&
    (wildCard[i]==str[j] || wildCard[i]=='?')) return m = solve(i+1, j+1);
    
    if(wildCard[i]=='*') return m = (solve(i, j+1) && j < str.length()) || solve(i+1, j);
    
    return 0;
}
int main(){
    vector<string> v;
        
    int tc, n;
    cin >> tc;
    while(tc-- > 0){
        
        cin >> wildCard >> n;
        while(n-- > 0){
            initialize();
            cin >> str;
            if(solve(0,0)) v.push_back(str);
        }
        sort(v.begin(), v.end());
        for(int i=0; i < v.size(); i++)
            cout << v[i] << endl;
        v.clear();
    }
}

```
