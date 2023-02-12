---
layout: post
categories: ["AI"]
title: "Concepts of Depth-wise separable convolution"
---

I read _"MobileNets: Efficient Convolutional Neural Networks for Mobile Vision Applications" by Andrew G. Howard, Menglong Zhu, Bo Chen, Dmitry Kalenichenko, Weijun Wang, Tobias Weyand, Marco Andreetto, Hartwig Adam_  
to understand _Depth-wise separable convolution_, and i'm going to organize key concepts about that.  
  
1. Purpose
2. Standard Convolution
3. Depth-wise Separable Convolution
4. Result 
  
## 1. Purpose
The purpose of the paper is making light weight Deep Neural Network(in terms of computation).  
To achieve that goal, they introduce _Depth-wise separabel Convolution_ and _Single global hyper-parameters_ which efficiently trade off between latency and accuracy.  
This article deals with _Depth-wise separable convolution_.  
  
## 2. Standard Convolution
![standard convolution filters](/assets/post/AI/depth_wise_separable_convolution/standard_convolution_filters.png)  
like above image, standard convoluion filters are applied to all channel of input , and each filter makes separate output channel, where $M$ is a number of input channels, $N$ is a number of output channels and $D_k \times D_k$ is kernel size of a filter. 
  
Thus, the standard convolutions have the computational cost of:  
$D_k \times D_k \times M \times N \times D_F \times D_F$  
where $D_F \times D_F$ is a size of input feature map.  
  
## 3. Depth-wise Separable Convolution
![](/assets/post/AI/depth_wise_separable_convolution/architecture.png)  
Depth-wise separable Convolution consists of two types of layers.  
each layer is followed by BatchNorm and ReLU like right one of above image.  
- Depth-wise conv
    - do convolution using one filter per input channel so that number of output channel is same as input
    - this separates each channel of input not mixing it.
- Point-wise conv
    - do linear combination of the output of depth-wise conv with 1x1 conv
    - by doing this, you can control output dimention
  
### 3.1. Depth-wise conv  
![depth-wise conv filters](/assets/post/AI/depth_wise_separable_convolution/depth_wise_conv_filters.png)
Like above image, Depthwise convolutional filters applied each input channel not mixing them.  
In the image, $D_k \times D_k$ is kernel size of a filter and $M$ is number of channel(input and output are same).   
  
Thus, computational cost is:  
$D_k \times D_k \times M \times D_F \times D_F$   
where $D_F \times D_F$ is a size of input feature map.  
  
### 3.2. Point-wise conv
![](/assets/post/AI/depth_wise_separable_convolution/point_wise_conv_filters.png)  
In the image, $M$ is a number of input channel and $N$ is a number of output channel.  
as you can see, this is for linear combination of input channels to fit to number of output channels.  
  
Thus, computational cost is:  
$M \times N \times D_F \times D_F$  
where $D_F \times D_F$ is a size of input feature map.  

## 4. Result  

__computational cost__  
![](/assets/post/AI/depth_wise_separable_convolution/compare_computation_cost.png)
above expression is a result of dividing _cost of Depth-wise separable conv_ by _cost of Standard conv_.  
as you can see, _Depth-wise separable conv_ is computationally efficient.  
  
__accuracy__  
![](/assets/post/AI/depth_wise_separable_convolution/compare_accuracy.png)
above table shows comparison of accuracy between standard conv(Conv MobileNet) and Depth-wise separable conv(MobileNet).   
There seems to be Pros and Cons between computational efficiency and accuracy.
