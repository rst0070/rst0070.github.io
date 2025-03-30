---
date: 2023-06-20
categories: ["AI"]
title: "ASP: Attentive Statistics Pooling"
---
The ASP is a pooling method commonly used in fields like speaker recognition and speaker verification. 
I will summary of the mechanism and show the example code of pytorch in this post.

## 1. Pooling method
Using deep neural network for speaker verification, there are features at different level for an utterance. 
Pooling methods are used to aggregate frame-level feature for extracting utterance-level feature(like speaker embedding).  
  
In previous works, statistics pooling is commonly used, aggregating frame-level feature into values of mean and standard deviation. 

## 2. Attention Mechanism
ASP uses attention mechanism to give different weights to different frames. 
For example, one frame contains high speaker-dependent information whereas another frame contains no inforamtion about the speaker like just noise. 
In this situation, deep neural network should treat high speaker-dependent frame like important feature. 

Attention Mechanism used in ASP is quite simple.
$$
e_t = v^T f(W h_t + b) + k, \\
\alpha_t = \frac{e^{e_t}}{\sum e^{e_k}}
$$
a scalar score $e_t$ of each frame $h_t$ is calculated by affine transformation -> non-linear activation -> affine transformation. 
The normalization process is softmax. 

## 3. Applying Weights
ASP calculates weighted mean and weighted standard deviation using the attention score. 
$$
\check{u} = \sum \alpha_t h_t, \\
\check{\sigma} = \sqrt{\sum(\alpha_t h_t^2) - u^2}
$$
These two values are aggregated frame level feature in ASP.

## Example code of ASP
I built an ASP block in pytorch. 
Commonly batch normalization is also used for getting attention weights. 
```python
import torch
import torch.nn as nn

class ASP(nn.Module):
    
    def __init__(self, in_channels):
        super(ASP, self).__init__()
        
        self.attention = nn.Sequential(
            nn.Conv1d(in_channels=in_channels, out_channels=128, kernel_size=1),
            nn.ReLU(),
            nn.Conv1d(in_channels=128, out_channels=in_channels, kernel_size=1),
            nn.Softmax(dim=2)
        )
    
    def forward(self, x):
        
        w = self.attention(x)
        w_mean = torch.sum(x * w, dim=2)
        w_std = torch.sqrt(( torch.sum((x**2) * w, dim=2) - w_mean**2 ).clamp(min=1e-5))
        
        x = torch.cat((w_mean, w_std), dim = 1)
        
        return x
    
if __name__ == "__main__":
    from torchsummary import summary
    
    model = ASP(10).cuda(0)
    summary(model, (10, 20))  
```
