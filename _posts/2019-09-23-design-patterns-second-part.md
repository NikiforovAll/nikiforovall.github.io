---
layout: post
title: Design Patterns. Creational Patterns. Part II.
categories: [general]
tags: [.NET, design-patterns, trydotnet]
fullview: false
published: false
comments: true
link-list: https://www.theurlist.com/design-patterns

---

Let's figure out in what cases it make sense to apply creational design patterns. In order to make things more demonstrative I will use [Try .NET]([https://link](https://github.com/dotnet/try)).

<h1> TOC </h1>

## Singleton

Ensure a class has only one instance and provide a global point of access to it.

**Use case**

*****

**Tradeoff:** Testability vs simplicity

**Frequency of use:** Medium high

**Examples in .NET**

*

---

Source code: [Singleton](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Singleton)

<!-- <script src="https://gist.github.com/NikiforovAll/7df61d2ce81fc70f2dbe23ad86a128c1.js"></script> -->

Example: [Try .NET](https://try.dot.net/?fromGist=7df61d2ce81fc70f2dbe23ad86a128c1)

``` csharp
public class Program
{
    public static void Main()
    {
            var s1 = Singleton.Instance;
            var s2 = Singleton.Instance;
            Assert.Equal(s1, s2);

            TestRunner.Print();
    }
}

```
<!-- <iframe src="https://try.dot.net/?fromGist=5054b18c0d8710d9ed9b888d5c0c76ff" markdown = "0"></iframe> -->
