---
layout: post
title: "[Review] LongMemEval"
---  
- [paper](https://arxiv.org/pdf/2410.10813)  
- [openreview](https://openreview.net/forum?id=pZiyCaVuti)  
## 0. Overview  
The research is about long-term memory ability of ai chat assistant. 
The contribution of the research could be divided into two parts:  
- Guiding how to make dataset and use it for evaluating long-term memory of ai assistant  
- Suggestion of design of long term memory, and Experiments on it  
  
Before getting started, lets check what values are of long-term memory, refered to the research.  
- _Information Extraction_
- _Multi-serssion Reasoning_
- _Knowledge Updates_
- _Temporal Reasoning_
- _Abstention_  
  
__Index__  
1. Structure of Evaluation Dataset
2. Evaluation method
3. Dataset building pipeline
4. long-term memory design suggestions
5. Experiments on long-term memory  

## 1. Structure of Evaluation Dataset  
Each item of Evaluation Dataset, or a problem, is structured like below:  
$$
problem\,=\,(\textbf{S},q, t_q, a) \\
\textbf{S} = [(t_1, S_1), (t_2, S_2), ..., (t_N, S_N)]
$$  
- $S_i$: multi-turn interaction between user and ai-assistant
- $q$: question
- $a$: answer
- $t_q$: timestamp of QA session ($t_q > t_N$)  
  
The answer is desired from answer and user's interaction history.  

## 2. Evaluation Methods
Two main methods:  
- Question-Answering
- Memory Recall
  
### a. Question Answering
Main idea: "Is ai assistant's answer good for given question?"  
  
__Target of the evaluation:__  
- AI assistant with the memories from dataset.  
  
__Evaluator:__  
- Prompt engineered LLM.
- Prompts are different by question task
    - temp-reasoning, knowledge-update, single sessinon preference, etc
- Extracts quality of answer of target assistant as figure.
  
__How to evaluate the Evaluator?__  
- Human expert determines by checking (question, answer of target assistant , answer of prompt engineered llm)
  

### b. Memory Recall
Evaluates retrieval performance.  
How?
- The evaluation dataset has Question & 
  
  
## 3. Dataset building pipeline
Main flow is like: 
1. make evidence conversation 
2. make whole chat conversation
  
## 4. long-term memory design suggestions

## 5. Experiments on long-term memory