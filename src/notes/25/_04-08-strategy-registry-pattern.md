---
title: "Strategy and Registry pattern(editing)"
date: 2025-04-08
---
I've been working on data pipelines and machine learning projects. 
Everytime the problem I've been wanting to solve is decoupling concerns: handling various inputs, outputs and algorithms afftected by data-source, model, etc.
  
It's little bit hard to describe without example!  
  
# Example of problem
These days I had to train a model, and with engineering perspective, I wanted to make it clean architectured project.  
So, We have following things inside the project:  
- components: model, loss-function, dataloader
- usecase: training model with given components
  
Here's the problem comming.  
*"How the usecase doesn't care about input/output of the model, loss-function and dataloader?"*  
  
```python
def training_usecase(dataloader, model, loss_function):
    """
    dataloader -> ? -> model -> ? -> loss_function
    """
```
  

To address this problem I found __Strategy / Registry pattern__.  
  
For detail about the concept, [here](https://refactoring.guru/design-patterns/strategy) is a good explaination.  
  
# Separating Concepts
In usecase, we don't know how to deal with specific input or output made by components.  

strategy implements how to deal with the specific situation.  


