---
layout: post
categories: ["AI"]
title: "Variational Auto Encoder 이해 및 구현"
---

## 0. 도움이 된 자료들
- [논문](https://arxiv.org/pdf/1312.6114.pdf?source=post_page---------------------------)
- [youtube 강의](https://www.youtube.com/watch?v=GbCAwVVKaHY)
- [블로그](https://process-mining.tistory.com/161)

## 1. 개요
Diffusion model에 대해 찾아보니 VAE(Variational Auto Encoder)와 관련된 개념이 많아 공부하게 되었다.  
일단 전체적인 구조를 보면 다음과 같다.  
![structure](/assets/post/AI/variational_auto_encoder/structure.png)  
VAE는 개념상으로 _Encoder_ 와 _Decoder_ 로 이루어져있는데, 입력 데이터 $x_i$에 대해 각각의 역할을 다음으로 정리해 볼 수 있다.  
  
__Encoder__  
입력 $x_i$를 통해 확률공간$q_{\phi}(z_i|x_i)$을 만든다. 이 확률공간은 latent space로 사용되며 가우시안 분포의 형태를 가진다. 
가우시안 분포를 만들기 위해선 평균과 표준편차가 필요하므로, 그림처럼 Encoder는 $x_i$를 통해 평균벡터$\mu_i$와 표준편차벡터$\sigma_i$를 생성한다.  
  
__Reparameterization Trick__  
Encoder가 생성해낸 latent space에서 latent vector인 $z_i$를 추출하는데 사용되는 방법이다. 
이 과정이 필요한 이유는, Encoder가 생성해낸 두 벡터에 대한 연산을 정의해야 역전파시 미분이 가능해지기 때문이다. 
  
__Decoder__  
latent vector인 $z_i$를 통해 output을 생성해낸다.  
  
## 2. VAE의 목적에 대해
논문의 _Problem Scenario_ 를 보면 _"주어진 데이터 $x_i$가 어떻게 생성되었을까?"_ 라는 질문과 그것에 대한 가정이 전제가 된다.  
  
__논문의 전제__   
$x_i$는 관측 불가하며 연속적인 $z$ 라는 랜덤 변수를 통해 생성된다. 
완벽한 주어진 데이터에 대한 완전한 모방이 가능한 파라미터 $\theta^*$ 가 주어질때  $x_i$가 생성되는 과정은 다음과 같다.   
1. 확률공간 $p_{\theta^*}(z)$에서 $z_i$ 가 생성된다. 
2. $p_{\theta^*}(x | z)$에서 $x_i$가 생성된다.  
  

__VAE의 목표__  
주어진 데이터 $x$에 대해 $p_{\theta}(x)$를 최대화하는 파라미터 $\theta$를 찾는다.  
즉 주어진 데이터와 가장 유사한 generative model을 생성하는것을 확률적으로 접근한 것 이다.  
  
## 3. 모델링시의 문제점 및 Encoder의 도입
2번을 통해 $p_{\theta}(x)$를 최대화 시키는것이 VAE의 목적임을 알았다. 하지만 $p_{\theta}(x)$를 직접 모델링하는데에는 몇가지 걸림돌이 있다.  
  
1. $p_{\theta}(x) \, = \, \int{p_{\theta}(z)p_{\theta}(x|z)dz}$ 가 계산 불가하다.
2. 베이즈 정리로 계산할 시 $p_{\theta}(x) \, = \, \frac{p_{\theta}(x|z)p_{\theta}(z)}{p_{\theta}(z|x)}$ 인데, $z$가 알려져 있지 않기 때문에 $p_{\theta}(z|x)$와 $p_{\theta}(z)$를 직접 구할 수 없다.  

위의 문제점을 해결하기 위해 VAE는 Encoder($q_{\phi}(z|x)$)를 통해 $p_{\theta}(z|x)$를 모방한다.  
따라서 VAE는 Encoder를 통해 추출된 $z$를 기반으로 $p_{\theta}(x)$를 최대화하는 목표를 가진다.  
수식으로 나타내면 $E_{z \sim q_{\phi}(z|x)}[p_{\theta}(x)]$를 최대화 하는것.  
  
## 4. Loss 유도 - Lower bound
$E_{z \sim q_{\phi}(z|x)}[ p_{\theta}(x)]$를 최대화 하는것은 $E_{z \sim q_{\phi}(z|x)}[ \log p_{\theta}(x) ]$를 최대화 하는것과 같다.  
여기서 KL은 kullback leibler divergence를 의미한다.  

$$
E_{z \sim q_{\phi}(z|x)}[ \log p_{\theta}(x) ] = E_{z}[ \log p_{\theta}(x | z) ] - E_{z}[ \log \frac{q_{\phi}(z|x)}{p_{\theta}(z)} ] + E_{z}[ \log \frac{q_{\phi}(z|x)}{p_{\theta}(z | x)} ] \\
=  E_{z}[ \log p_{\theta}(x | z) ] - \int q_{\phi}(z|x) \log \frac{q_{\phi}(z|x)}{p_{\theta}(z)} dz + \int q_{\phi}(z|x) \log \frac{q_{\phi}(z|x)}{p_{\theta}(z | x)} \\ 
=  E_{z}[ \log p_{\theta}(x | z) ] - KL(q_{\phi}(z|x) || p_{\theta}(z)) + KL(q_{\phi}(z|x) || p_{\theta}(z|x))
$$  
위처럼 계산된 수식에 아래의 두 가지 요인을 적용하여 loss를 단순화 한다.
- kullback leibler divergence는 항상 0 이상의 값이다.
- $p_{\theta}(z|x)$는 계산 불가하다.  

따라서 마지막 항을 제거하고 $E_{z \sim q_{\phi}(z|x)}[ \log p_{\theta}(x) ]$의 하한값을 최대화 시키는 문제로 수식을 변형 할 수 있다.  
  
최종적으로 lower bound로서 loss를 정의할 수 있다.  
$$
E_{z \sim q_{\phi}(z|x)}[ \log p_{\theta}(x) ] \ge  E_{z}[ \log p_{\theta}(x | z) ] - KL(q_{\phi}(z|x) || p_{\theta}(z))
$$  
  
## 5. Loss 계산
$$
E_{z}[ \log p_{\theta}(x | z) ] - KL(q_{\phi}(z|x) || p_{\theta}(z))
$$  
위 수식을 최대화 하는 문제를 아래의 값을 최소화 시키는것 으로 변형 할 수 있다.(일반적인 loss를 계산할 때 처럼)
$$
{-} E_{z}[ \log p_{\theta}(x | z) ] + KL(q_{\phi}(z|x) || p_{\theta}(z))
$$  
이제 각각의 항들을 계산하면된다.  
  
### 5.1 Reconstruction Error: ${-} E_{z}[ \log p_{\theta}(x | z) ]$
$$
{-} E_{z \sim q_{\phi}(z|x)}[ \log p_{\theta}(x | z) ] = - \int q_{\phi}(z|x) \log p_{\theta}(x|z) dz
$$
위에서 모든 $z$에 대한 계산이 불가능하기 때문에 Monte-carlo technique를 사용한다. 
이 방법은 전체 $z$를 구하는대신에 $L$개의 $z$에 대한 계산만 진행하는것 이다.  
VAE는 $L$을 1로 두고 계산한다.
$$
{-} \log p_{\theta}(x | z)
$$  
  
계산하기 위해 또 생각해야할 것이 있는데, 바로 $x$의 분포이다. 
$x_i$가 주어진 데이터 벡터이고, $p_i$가 모델의 출력 벡터일때.  
  
__x_i의 각 값들이 Bernoulli Distribution이라 가정하면__  
Cross Entropy의 형태를 가진다.  
$$
{-} \log p_{\theta}(x_i | z_i) 
= - \log (	\prod_{j=1}^D p_{\theta}(x_{i, j} | z_i)) 
= - \sum_{j=1}^D \log(p_{\theta}(x_{i, j} | z_i))
= - \sum_{j=1}^D \log(p_{i,j}^{x_{i,j}}(1-p_{i,j})^{1-x_{i,j}})
= - \sum_{j=1}^D \{ x_{i,j}\log p_{i,j} + (1 - x_{i,j}) \log (1-p_{i,j}) \}
$$  

__x_i의 각 값들이 Gaussian Distribution이라 가정하면__  
표준편차가 1일때 MSE가 된다.  
$$
x_i \sim \mathcal{N}(\mu_i, \sigma_i^2 I)
$$
$$
{-} \log p_{\theta}(x_i | z_i) 
= - \log ( \mathcal{N}(x_i; \mu_i, \sigma_i^2 I) ) 
= - \sum_{j=1}^{D} \{ \frac{1}{2} \log \sigma_{i,j}^2 +  \frac{(x_{i,j} - \mu_{i,j})^2}{2 \sigma_{i,j}^2} \}
$$
  
### 5.2 Regularization: $KL(q_{\phi}(z|x) || p_{\theta}(z))$
위 항을 최소화하는데 두가지 가정이 필요하다.  
- $p_{\theta}(z) = \mathcal{N}(0, I)$
- $$ $\mathcal{N}(\mu_i, \sigma_i^2 I)$
