---
layout: post
categories: ["Course", "LinearAlgebra"]
title: "[선형대수] $Ax = b$의 관점"
---
1. [Vector as a Function](#1-vector-as-a-function)
2. [Combination of columns: Column Picture](#2-combination-of-columns-column-picture)
3. [Mutiplication a row at a time: Row Picture](#3-mutiplication-a-row-at-a-time-row-picture)
4. [Independence vs Dependence](#4-independence-vs-dependence)
  
- - -
## 1. Vector as a Function  
작성중..
- - -
## 2. Combination of Columns: Column Picture  
$$
A = \begin{bmatrix} 1 && 2 \\ 3 && 4 \end{bmatrix} = \begin{bmatrix} \vec{c_1} && \vec{c_2} \end{bmatrix} \quad 
(\vec{c_1}= \begin{bmatrix} 1 \\ 3 \end{bmatrix} \quad 
\vec{c_2}= \begin{bmatrix} 2 \\ 4 \end{bmatrix})
$$  

위와 같은 행렬$A$는 두개의 Column으로 이루어졌다.  
이때 Column을 Column Vector로 볼 수 있다.  

이러한 관점에서 $Ax = b$는 *Column Vector들의 linear combination*이다.  

$$
Ax=\begin{bmatrix} \vec{c_1} && \vec{c_2} \end{bmatrix} \begin{bmatrix} x_1 \\ x_2 \end{bmatrix}
= x_1\cdot\vec{c_1} + x_2\cdot\vec{c_2}
= b
$$  
- - -  
## 3. Mutiplication a row at a time: Row Picture
$$
A = \begin{bmatrix} 1 && 2 \\ 3 && 4 \end{bmatrix}
= \begin{bmatrix} \vec{r_1} \\ \vec{r_2} \end{bmatrix} \quad 
(\vec{r_1}= \begin{bmatrix} 1 && 2 \end{bmatrix} \quad 
\vec{r_2}= \begin{bmatrix} 3 && 4 \end{bmatrix})
$$  

위와 같은 행렬$A$는 두개의 row로 이루어졌다.  
이때 Row를 Row Vector로 볼 수 있다.  

이러한 관점에서 $A\vec{x} = b$는 *Row Vector들을 한 행씩 $\vec{x}$와 Dot product를 하여 각 행으로 옮긴것*이다.  

$$
Ax = \begin{bmatrix} 1 && 2 \\ 3 && 4 \end{bmatrix}
= \begin{bmatrix} \vec{r_1} \\ \vec{r_2} \end{bmatrix} \vec{x}
= \begin{bmatrix} \vec{r_1}\cdot\vec{x} \\ \vec{r_2}\cdot\vec{x} \end{bmatrix}
= b
$$  
- - -  
## 4. Independence vs Dependence
$$
A = \begin{bmatrix} \vec{u} && \vec{v} && \vec{w} \end{bmatrix}
$$  
위와 같이 행렬을 column vector들로 표현할 때 $Ax=b$는 *Column Vector들의 linear combination*임을 알았다. 이때 column vector들의 관계에 따라 solution인 x의 특징을 나눠볼 수 있다.  

### 4.1 dependent
3차원 공간에서 생각했을때 $\vec{w}=a\vec{u} + b\vec{v}$라면 
$u, v, w$를 포함하는 평면$\alpha$를 찾을 수 있다.  
  
$b$ vector의 특성에 따라 solution의 특징이 달라진다.  
* $b$는 $\alpha$위에 존재한다. - x는 무수히 많은 값이 될 수 있다.
* $b$는 $\alpha$위에 존재하지 않는다. - x가 존재하지 않는다.  
  
이 상황에서의 matrix $A$를 singular matrix라 한다.  

### 4.2 independent
dependent와 반대로 어떠한 vector도 서로의 linear combination으로 표현할 수 없는 경우이다.  
이 경우에 $Ax=b$는 유일한 solution을 갖는다.  
이때 $A$를 ivertible하다고 한다.