---
layout: post
title: "Sorting algorithms with C# 8, Span<T> and Try .NET"
categories: [ algorithms ]
tags: [ dotnet-try, algorithms, csharp8 ]
fullview: false
published: true
comments: true
hide-related: true
---

I would like to share with you something fun. The right way to write interactive documentation - [Try .NET](https://github.com/dotnet/try). It is an awesome project maintained by Microsoft. It allows you to embed C# code inside your markdown documentation and run it locally. The absolute best way to learn it is to use it. So I encourage you to fork <https://github.com/NikiforovAll/intro-to-algorithms> and play with it.

All you need to do is to navigate to root directory and run:

```console
dotnet tool install -g dotnet-try
dotnet try
```

On the demo below you can find implementation of standard sorting algorithms with C# 8 and `Span<T>`.

![demo](/assets/try-dotnet-and-sorting/demo.gif)

Non-interactive version: <https://github.com/NikiforovAll/intro-to-algorithms/blob/master/docs/Sorting.md>
