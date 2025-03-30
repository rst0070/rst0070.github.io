---
date: 2024-06-24
categories: ["Algorithm"]
title: "Locality Sensitive Hasing [LSH] Example"
---
This article is for showing an example of How LSH works on simple documents.  

## Overview and given problem of LSH
<img src="/assets/notes/24/06-24/1_lsh_overview.png" />   

As you can see from the above image, The LSH process contains 3-big steps.  
1. Shingling
    - documents to set of fixed length words
2. Min Hashing
    - Making signature from document, reduce the size of data
3. Locality Sensitive Hashing
    - Get candidate pairs by applying hash functions.
  
__Given example documents__  
We will use below 3 documents.  
- doc1 - `abcabcabc`
- doc2 - `cbacbacba`
- doc3 - `bacbaacba`
  
## 1. Shingling
We will use 2-shingles to represent each document.  
- doc1 : `abcabcabc` -> `<ab, bc, ca>`
- doc2 : `cbacbacba` -> `<ac, ba, cb>`
- doc3 : `bacbaacba` -> `<aa, ac, ba, cb>`
  
## 2. MinHashing
Below image shows algorithm of MinHashing. The key point of MinHashing is hashing can be interpreted as a permutation, when it maps index to index.  
<img src="/assets/notes/24/06-24/2_minhash_alg.png" />  

Steps:
1. Represent documents to Bitmap
2. Using MinHash functions, make signatures  
  
### Set of Shingles to Bitmap
<img src="/assets/notes/24/06-24/3_bitmap.png" />  

### Min Hashing
We will use 6 different hash functions.  
- $h_1(x)=x\,mod\,5$
- $h_2(x)=2x+1\,mod\,5$
- $h_3(x)=x+3\,mod\,5$
- $h_4(x)=2x+3\,mod\,5$
- $h_5(x)=x+4\,mod\,5$
- $h_6(x)=2x+4\,mod\,5$  

Applying this, we will get 6-dimensional($h_1$ ~ $h_6$) integer vector for each document.  
Below shows example of finding MinHash values.  
<img src="/assets/notes/24/06-24/4_minhash_example.png" />  

You can see the result signature vectors below.  

<img src="/assets/notes/24/06-24/5_signatures.png" />  

  
## 3. Locality Sensitive Hashing
Steps:  
1. Signature matrix and Hashing it
    - Hash the signatures of documents
2. AND-OR or OR-AND (BAND) technique.
    - Compare Hash values 
    - AND-OR
        - all hash values in each band have to be same, and at least one band has to satisfy the condition
    - OR-AND
        - at least one row in a band have to have same hash values, and all band have to satisfy the condition  
  
<img src="/assets/notes/24/06-24/6_lsh1.png" />   

<img src="/assets/notes/24/06-24/7_lsh2.png" />   

For AND-OR technique, `(doc1, doc2)` and `(doc1, doc3)` are candidate pairs.  
For OR-OR technique, `(doc1, doc3)` and `(doc2, doc3)` are candidate pairs.  
