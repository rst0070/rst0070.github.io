---
layout: post
categories: ["AI"]
title: "Residual Learning Concepts"
---  

I'm going to organize a few key concepts from "Deep Residual Learning for Image Recognition" by Kaiming He, Xiangyu Zhang, Shaoqing Ren, and Jian Sun.    
  
1. [What is the problem](#1-what-is-the-problem)
2. [How to solve the problem](#2-how-to-solve-the-problem)
3. [Residual Learning](#3-residual-learning)
4. [Identity Mapping by Short cuts](#4-identity-mapping-by-shortcuts)
5. [Deeper Bottleneck Architecture](#5-deeper-bottleneck-architecture)

  
## 1. What is the problem
The depth of a network is an important factor that determines its performance in deep learning. However, deepening the network can cause the vanishing or exploding gradient problem. To solve this, solutions such as Batch Norm and weight initialization were introduced. 
  
Although these solutions allowed deeper networks to converge, the training error did not decrease.

![deeper network has higher training error](/assets/post/AI/deep_residual_learning/training_error.PNG)    
## 2. How to solve the problem
The authors believe that the problem is due to the difficulty of optimizing deeper layers, not overfitting.  
They ask the question, "If deeper layers act like an identity function, would the training error drop?" The answer is Residual Learning and Shortcut connections.  
  
## 3. Residual Learning
![previous learning function - research gate](/assets/post/AI/deep_residual_learning/previous_learning_function.png)  

In deep learning, each building block of a model has its own function `h(x)` for the input `x`.   
  
The authors suggest that if a block can learn the function `h(x)`, it can also learn the residual function `F(x) = h(x) - x`.  
  
Using a residual function with an identity mapping (`F(x) + x`) produces the same output as before, but the difficulty of optimization is different.  
  
for example, if the identity mapping is optimal, the block only has to produce an output of zero. As a result, residual learning with an optimal identity mapping does not exceed the training error of a shallow network.   
  
## 4. Identity mapping by shortcuts  
![](/assets/post/AI/deep_residual_learning/residual_learning.png)  
The paper describes two types of identity mapping
- no size difference between input and output
- size difference between input and output
  
__1. no size difference__  
$Y \, = \, F(X, \, {W_i}) \, + \, X$  
there is no need to change the input size, and the output is the sum of the input and the residual function (F: output of the building block).
  
__2. size difference__  
$Y \, = \, F(X, \, {W_i}) \, + \, W_sX \,\,\,(W_s:projection)$  
the input size needs to be changed, and the output is produced by projecting the input.  
  
__etc__  
In other studies, it is shown that identity mapping address the vanishing / exploding gradient problem.  
  
## 5. Deeper Bottleneck Architecture 
The right one of below image is an example of bottleneck architecture.  
![bottleneck block](/assets/post/AI/deep_residual_learning/bottleneck.png)  
  
A bottleneck architecture reduces the dimensionality of the input while maintaining that of the output.

The architecture consists of three layers: a 1x1 convolution for reducing dimension, a 3x3 convolution for maintaining dimension, and a final 1x1 convolution for increasing dimension. This architecture is more computationally efficient than a deeper network without a bottleneck.

__why use bottleneck?__  
By reducing dimensionality of input, number of computation in building block can be decreased, and less computation leads to time efficiency.  
  
__Role of each layer of bottleneck architecture__  
- first 1x1 conv
    - reducing dimension (compressing)
- 3x3 conv
    - maintaing dimension
- final 1x1 conv
    - increasing dimension (restoring)