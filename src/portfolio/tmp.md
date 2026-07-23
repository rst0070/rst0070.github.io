Multimodal RAG

## Goal
I got requirement like "Make our system support multimodal RAG feature" -> I was like "what?", and tried to figure out exactly where the "multimodal" feature would live.

Because we just didnt have image processing - only chat attachment

so I found following specifics "what is supporting Multimodal RAG":
- knowledge base to process images and files including images
- RAG chatbot and Agentic chatbot to process the images from connected knowledge base
- proper logic for processing images

So it was "complete E2E logic for multimodal processing"

## Constraint
First, I was thinking to use separated vector database index (elasticsearch index) not using same index with text nodes --> however, our direction was "make a simple way", so I had to find a way to use "same index" with text nodes.

Most of the constraints were from existing system's limitation
- background: codebase is deeply coupled with llamaindex
- LlamaIndex’s core abstractions (chat engine, response synthesizer, agent framework) had no native support for image nodes
