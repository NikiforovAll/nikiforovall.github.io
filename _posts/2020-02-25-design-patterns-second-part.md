---
layout: post
title: Design Patterns. Creational Patterns. Part II.
categories: [general]
tags: [dotnet, csharp, design-patterns]
fullview: false
published: false
comments: true
link-list: https://www.theurlist.com/design-patterns

---

The goal of this post is to figure out in what cases a developer should apply design patterns and try to outline practical usage of creational patterns in common scenarios.

<h1> TOC </h1>

- [Singleton](#singleton)
  - [Use case](#use-case)
  - [Tradeoffs](#tradeoffs)
  - [Recommendations](#recommendations)
- [Factory Method](#factory-method)

## Singleton

Ensure a class has only one instance and provide a global point of access to it.

### Use case
Just like a global variable, singleton allows you to access same object instance from anywhere in the program. As result, you could drastically simplify solution complexity and solve a bunch of problems which might occur when you want to have control over shared object/resource/state. I think the real power of Singleton pattern is that it could be accessed anywhere from defined scope of accessibility.

Singleton hides next implementation details: 1. Complexity of initialization 2. Control over object lifetime 3. Thread-safety aspects

**Complexity of initialization:**

**Control over object lifetime:**

**Thread-safety:**

### Tradeoffs

### Recommendations

- Avoid Singleton pattern, consider to incorporate IoC container instead. This will increase testability.
- Select the minimum level of accessibility for singleton object. Singleton Patterns adds a ton of coupling in your system, so you really want to define strict boundaries therefore the constraints on which modules should have access to singleton object.

**Frequency of use:** Medium high 😱

**Examples in .NET:**

* [TODO:] Thus, the runtime can simply cache a single non-generic Task and use that over and over again as the result task for any async Task method that completes synchronously (that cached singleton is exposed via `Task.CompletedTask`)
* [TODO:] public static System.IO.TextReader In { get; }

Example: [Try .NET](https://try.dot.net/?fromGist=7df61d2ce81fc70f2dbe23ad86a128c1)

``` csharp
public class Program
{
    public static void Main()
    {
            var s1 = Singleton.Instance;
            var s2 = Singleton.Instance;
            Assert.Equal(s1, s2); // wow!
            TestRunner.Print();
    }
}
```

Source code: [Singleton](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Singleton)

## Factory Method
<!-- <iframe src="https://try.dot.net/?fromGist=5054b18c0d8710d9ed9b888d5c0c76ff" markdown = "0"></iframe> -->
