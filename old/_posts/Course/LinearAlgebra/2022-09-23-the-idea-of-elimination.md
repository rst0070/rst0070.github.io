---
layout: post
categories: ["Course", "LinearAlgebra"]
title: "[선형대수] Elimination의 기본 개념"
---
Elimination은 $Ax=b$를 row picture관점에서 연립방정식의 소거법으로 해결하는것이다.  
이를 기계적으로 수행하는 방법들이 있다. 이 글에서는 기본 개념을 정리하고자 한다.  
  
1. [Upper Triangular System](#1-upper-triangular-system)
2. [Pivot과 Mutiplier](#2-pivot과-mutiplier)
3. [Permutation Matrix](#3-permutation-matrix)
4. [Augmented Matrix](#4-augmented-matrix)
5. [Elimination as Matrix Multiplication](#5-elimination-as-matrix-multiplication)
  
- - -
## 1. Upper Triangular System
$Ax=b$의 solution을 1차 연립방정식의 solution으로 본다면, 연산을 통해 solution을 구하기 쉽도록 
방정식을 변환할 것이다. 이러한 아이디어를 행렬에 적용하여 아래와 같이 대각선 아래가 0인 행렬을 만드는것이다.  
$$
\begin{bmatrix}
a_{11} && a_{12} && a_{13} \\
0 && a_{22} && a_{23} \\
0 && 0 && a_{33}
\end{bmatrix}
$$  
이러한 형태의 이점은 아래서부터 solution에 해당하는 x vector의 원소 하나씩 구해낼 수 있다는 것 이다.  
  
- - -
## 2. Pivot과 Mutiplier
* Pivot은 Elimination결과의 diagonal(위의 $a_{11}, a_{22}, a_{33}$ )들이다. 
* elimination은 $row_{i}$에 mutiplier를 곱해서 $row_{i+1}$에 뺄셈을 적용하는것이다. 이 과정을 통해 upper triangular를 만들어 solution을 구한다.  

예시 - j행에 곱하여 i행에 빼줄 multiplier $l_{ij} = { a_{ij} }/{a_{jj} }$  
  
- - -
## 3. Permutation Matrix
Elimination을 진행하다보면 row의 순서를 변경해줘야하는 경우가 발생한다. 이를 Matrix의 multiplication으로 수행하기 위해 만들어진 Matrix가 Permutation Matrix이다.  
  
__예시__  
$$
\begin{bmatrix}
    1 && 0 && 0 \\
    0 && 0 && 1 \\
    0 && 1 && 0
\end{bmatrix}
\begin{bmatrix}
    \vec{r_{1}} \\
    \vec{r_{2}} \\
    \vec{r_{3}}
\end{bmatrix}
=
\begin{bmatrix}
    \vec{r_{1}} \\
    \vec{r_{3}} \\
    \vec{r_{2}}
\end{bmatrix}
$$  

- - -
## 4. Augmented Matrix
$Ax=b$에서 Elimination을 수행할때 matrix A와 vector b는 원소의 변화가 일어난다. 하지만 vector x는 주요하게 신경쓸 대상이 아니다.  
따라서 A와 b를 계산하기 쉽도록 함께 표기하기 위한 matrix를 도입한다.  
__예시__  
$$
\left[
    \begin{array}{c|c}
    A & b
    \end{array}
\right]
=
\left[ \begin{array}{ccc|c} 
    2 & 4 & -2 & 2 \\
    4 & 9 & -3 & 8\\ 
    -2 & -3 & 7 & 10
\end{array} \right]
$$  
  
- - -
## 5. Elimination as Matrix Multiplication
Elimination과정을 matrix의 multiplication으로 표현할 수 있다.  
이때 identity matrix에 multiplier를 추가한 형태를 가진다. 
즉 i행에 $l_{ij}$를 곱해 j행에서 뺄려는 동작을 수행하는 Matrix $E_{ij}$는 i행 j열에 $l_{ij}$를 원소로 갖는다.  
  
__예시__
$$
\left[
    \begin{array}{ccc}
    1 & 0 & 0 \\
    -2 & 1 & 0 \\
    0 & 0 & 1
    \end{array}
\right]
\left[
    \begin{array}{ccc|c} 
    2 & 4 & -2 & 2 \\
    4 & 9 & -3 & 8\\ 
    -2 & -3 & 7 & 10
    \end{array}
\right]
=
\left[
    \begin{array}{ccc|c} 
    2 & 4 & -2 & 2 \\
    0 & 1 & 1 & 4\\ 
    -2 & -3 & 7 & 10
    \end{array}
\right]
$$  
위와 같은 과정을 반복하여 아래와 같이 만드는것.  
$$
E_{32}E_{31}E_{21}
\left[
    \begin{array}{c|c}
    A & b
    \end{array}
\right]
=
\left[
    \begin{array}{c|c}
    U & c
    \end{array}
\right]
$$