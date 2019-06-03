---
layout: post
title: Design Patterns. Behavioral Patterns. Part I.
categories: [general]
tags: [.NET, design-patterns]
fullview: true
comments: false
link-list: https://www.theurlist.com/design-patterns
---

Yes, you might say that blogging about design patterns is boring and dull. And you are probably right. But what about version with live examples?

<h1> TOC </h1>

- [Strategy](#strategy)
- [Template Method](#template-method)
- [Visitor](#visitor)
- [State](#state)
- [Mediator](#mediator)
- [Observer](#observer)
- [Memento](#memento)
- [Iterator](#iterator)
- [Interpreter](#interpreter)
- [Command](#command)
- [ChainOfResponsibility](#chainofresponsibility)

## Strategy

Defines a family of algorithms, encapsulate each one, and make them interchangeable. Strategy lets the algorithm vary independently from clients that use it. Strategy adapts behavior at runtime to requirements that are not known in advance.

In general case Pattern Strategy doesn't restrict the number of operations in defined interface. So it could be one operation (*Sort* in *ISortable*) or family of operations (*Encode/Decode* in *IMessageProcessor*). In case when it is one operation, it is possible to use .NET specific implementation that relies on delegate Funct<T1, T2,...> or Action<T1, T2,...>.

**Use case**

* When you want to encapsulate some behavior or part of algorithm.
* When you want to change behavior of runtime.

**Tradeoff:** Flexibility vs complexity

**Frequency of use:** High

**Diagram**

![strategy-diagram](/assets/design-patterns/strategy-1.png)

**Examples in .NET**

* Many extension methods in LINQ accepts strategy methods. For example *IComparer\<T\>* or *IEqualityComparer\<T\>*.
* WCF contains a lot of examples of strategy pattern: *IErrorHandler*, *IDispatchMessageFormatter*, *MessageFilter*.

---

Source code: [Strategy](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Strategy)

<!-- <script src="https://gist.github.com/NikiforovAll/5054b18c0d8710d9ed9b888d5c0c76ff.js"></script> -->

Example: [Try .NET](https://try.dot.net/?fromGist=5054b18c0d8710d9ed9b888d5c0c76ff)

``` csharp
public class Program
{
    public static void Main()
    {
            ILogReader logReader;
            // log storage number one
            logReader = new LogFileReader();
            List<LogEntry> logEntryList1 = logReader.Read();
            Assert.Equal(2, logEntryList1.Count);
            Assert.Contains("LogFileReader", logEntryList1[0].Message);
            // log storage number two
            logReader = new WindowsEventLogReader();
            List<LogEntry> logEntryList2 = logReader.Read();
            Assert.Single(logEntryList2);
            Assert.Contains("WindowsEventLogReader", logEntryList2[0].Message);
            TestRunner.Print();
    }
}

```
<!-- <iframe src="https://try.dot.net/?fromGist=5054b18c0d8710d9ed9b888d5c0c76ff" markdown = "0"></iframe> -->

## Template Method

Define the skeleton of an algorithm in an operation, deferring some steps to subclasses. Template Method lets subclasses redefine certain steps of an algorithm without changing the algorithm's structure. It is possible to use .NET specific implementation that relies on extension methods and namespaces. So template method is defined by public extension methods, implementation is determined by compile-time.

**Frequency of use:** Medium

**Diagram**

![strategy-diagram](/assets/design-patterns/template-method-1.png)

---

Source code: [Template Method](https://github.com/NikiforovAll/design-patterns-playground/tree/master/TemplateMethod).

Example: [Try .NET](https://try.dot.net/?fromGist=07a88aff3888b777015a574eb067960f)

``` csharp
public class Program
{
    public static void Main()
    {
        var items = new [] { 1, 2, 3, 4, 5 };
        // define behavior via subclassing
        AbstractClass processor = new ConcreteProcessor1();
        int result1 = processor.Process(items);
        Assert.Equal(24, result1);
        processor = new ConcreteProcessor2();
        int result2 = processor.Process(items);
        Assert.Equal(15, result2);
        TestRunner.Print();
    }
}
```

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Visitor

Frequency of use:

Source code: [Visitor](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Visitor)

Example: [Try .NET](https://try.dot.net/?fromGist=)

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## State

Frequency of use:

Source code: [State](https://github.com/NikiforovAll/design-patterns-playground/tree/master/State).

Example: [Try .NET](https://try.dot.net/?fromGist=)

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Mediator

Frequency of use:

Source code: [Mediator](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Mediator).

Example: [Try .NET](https://try.dot.net/?fromGist=)

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Observer

Frequency of use:

Source code: [Observer](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Observer).

Example: [Try .NET](https://try.dot.net/?fromGist=)

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Memento

Frequency of use:

Source code: [Memento](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Memento).

Example: [Try .NET](https://try.dot.net/?fromGist=)

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Iterator

Frequency of use:

Source code: [Iterator](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Iterator).

Example: [Try .NET](https://try.dot.net/?fromGist=)

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Interpreter

Frequency of use:

Source code: [Interpreter](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Interpreter).

Example: [Try .NET](https://try.dot.net/?fromGist=)

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Command

Frequency of use:

Source code: [Command](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Command).

Example: [Try .NET](https://try.dot.net/?fromGist=)

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## ChainOfResponsibility

Frequency of use:

Source code: [ChainOfResponsibility](https://github.com/NikiforovAll/design-patterns-playground/tree/master/ChainOfResponsibility).

Example: [Try .NET](https://try.dot.net/?fromGist=)

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->
