---
layout: post
categories: Kotlin
title: "Kotlin Syntax about Functions"
---

- Default Parameter Values

## Vararg Parameters
`vararg`is keyword used to define a parameter. This keyword means the parameter is numberically variable.  
Thus the parameter can be used as an array, even as an empty array.
``` kotlin
fun printTexts(vararg texts: String){
    texts.forEacch{ item ->
        println("$item")
    }
}
fun main(){
    printTexts("a", "b", "c")

    var array = arrayOf("a", "b", "c")
    //using spread operation
    printText(*array)
}
```
If do not pass any parameter to `printText()`, the parameter `texts` would be an empty array.
Reference: [spread operation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)

## Named argument
Calling a function, each argument can be named like ket-value pair.  
This can reduce errors in complex codes.
``` kotlin
fun sendMessage(from: String, to: String, ms: String)
    = println("to $to , $ms, from $from")

fun main(){
    sendMessage(from = "rst", to = "home", ms = "message")
}
```

## Default Parameter Values
Parameters of a function can have default values at defining the function.  
Below code will print 'Hello'.
``` kotlin
fun printText(text: String = "Hello") = println("$text");
fun main(){
    printText();
}
```