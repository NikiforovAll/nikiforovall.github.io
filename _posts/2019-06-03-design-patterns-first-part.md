---
layout: post
title: Design Patterns. Behavioral Patterns. Part I
categories: [general]
tags: [.NET, design-patterns, trydotnet]
fullview: false
comments: true
link-list: https://www.theurlist.com/design-patterns
---

Yes, you might say that blogging about design patterns is boring. But what about interactive version with live examples and  [Try .NET]([https://link](https://github.com/dotnet/try))? Let's delve into it.

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

Defines the skeleton of an algorithm in an operation, deferring some steps to subclasses. Template Method lets subclasses redefine certain steps of an algorithm without changing the algorithm's structure. In some cases this pattern is better when you have plenty of functionality to reuse or you have complicated hierarchy of behaviors to implement so you could use sliding version of template method.

It is possible to use .NET specific implementation that relies on extension methods and namespaces. So template method is defined by public extension methods, implementation is determined by compile-time.

**Use case**

* When you want to encapsulate some behavior or part of algorithm.
* When you want to define strict contract for developers to reuse some functionality by using inheritance over composition.

**Frequency of use:** Medium

**Diagram**

![strategy-diagram](/assets/design-patterns/template-method-1.png)

**Examples in .NET**

* WCF contains a lot of examples of template method pattern: *CommunicationObject*, *ServiceHostBase*, *MessageHeader*, *ChannelBase*.
* System.Runtime.InteropServices.SafeHandle represents a wrapper class for operating system handles.

---

Source code: [Template Method](https://github.com/NikiforovAll/design-patterns-playground/tree/master/TemplateMethod).

Example: [Try .NET](https://try.dot.net/?fromGist=07a88aff3888b777015a574eb067960f)

``` csharp

public abstract class AbstractClass
{
    // TemplateMethod
    public int Process(IEnumerable<int> items)
    {
        return items
            .Where<int>(this.Filter)
            .Select(this.ProcessUnit)
            .Aggregate((item, acc) =>
                {
                    acc += item;
                    return acc;
                });
    }
    protected abstract bool Filter(int item);
    protected abstract int ProcessUnit(int i);
}
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

Define an object that encapsulates how a set of objects interact. Mediator promotes loose coupling by keeping objects from referring to each other explicitly, and it lets you vary their interaction independently.

Mediator could be used at different level of application. It could be class as mediator, component as mediator, application-layer as mediator. For example, components could be connected in *Composition Root* by applying Mediator pattern.

**Use case**

* When you want to describe interaction between autonomous components in loose-coupled way. Implicit mediator vs explicit mediator.

**Frequency of use:** Medium

**Diagram**

![strategy-diagram](/assets/design-patterns/mediator-1.png)

**Examples in .NET**

* *EventAggregator* class in WPF.
* In MVC, *Controller* is actually a mediator.

---

Source code: [Mediator](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Mediator).

Example: [Try .NET](https://try.dot.net/?fromGist=7317a1315a966b82927622fb90c2f7fb)

``` csharp

public class Chatroom : AbstractChatroom {
    private Dictionary<string, User> _users = new Dictionary<string, User> ();
    public override void Register (User user) {
        if (!_users.ContainsValue (user)) {
            _users[user.Name] = user;
        }
        user.Chatroom = this;
    }

    public override void Send (string from, string to, string message) {
        User participant = _users[to];

        if (participant != null) {
            participant.Receive (from, message);
        } else {
            throw new KeyNotFoundException ("User not found");
        }
    }
}
```

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Observer

Define a one-to-many dependency between objects so that when one object changes state, all its dependents are notified and updated automatically.

**Frequency of use:** High

**Diagram**

![strategy-diagram](/assets/design-patterns/observer-1.gif)


**Examples in .NET**

---

Source code: [Observer](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Observer).

Example: [Try .NET](https://try.dot.net/?fromGist=4c2a9b41ac08a5a0ab61bd0c75f7132a)

``` csharp
public class Program
{
    public static void Main()
    {
            var subject = new ConcreteSubject();
            var observers = new[] { new ConcreteObserver(), new ConcreteObserver(), new ConcreteObserver() };
            foreach (var observer in observers)
            {
                subject.Attach(observer);
            }
            subject.SubjectState = "init";
            subject.Notify();
            Assert.All(observers, (el => "init".Equals(el.State)));
            subject.SubjectState = "changed";
            subject.Notify();
            Assert.All(observers, (el => "changed".Equals(el.State)));
            TestRunner.Print();
    }
}
```

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Memento

Frequency of use:

Source code: [Memento](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Memento).

Example: [Try .NET](https://try.dot.net/?fromGist=)

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Iterator

Provide a way to access the elements of an aggregate object sequentially without exposing its underlying representation.

Iterators in .NET are unidirectional and lazy, every time you invoke *GetEnumerator()* new instance is returned. Also, iterators are mutable by default, so it is better to use struct iterators and save yourself from potential issues.

**Use case**

* Use iterator when you want to provide uniform way to perform custom and stateful iteration of a collection of objects.

**Frequency of use:** High

**Diagram**

![strategy-diagram](/assets/design-patterns/iterator-1.png)

**Examples in .NET**

* *IEnumerable/IEnumerator* - collections in .NET.
* Any object that has GetEnumerator method could play a role of Iterator in .NET.
* *yield return* construction is used to implement generators in .NET.

---

Source code: [Iterator](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Iterator).

Example: [Try .NET](https://try.dot.net/?fromGist=2619980fdd524d700956f65825176f17)

``` csharp
public class Program {
    public static void Main () {
        var collection = new CustomCollection<int> { 1, 2, 3, 4, 5 };
        var iterator = collection.CreateIterator ();
        Assert.Equal (new int[] { 1, 3, 5 }, iterator.getCollectionFromIterator ().ToList ());
        TestRunner.Print ();
    }
}
// part of iterator implementation
//Step = 2;
public override T Next () {
    T result = default (T);
    if (!IsDone ()) {
        result = _collection[_currentIndex];
        _currentIndex += Step;
    }
    return result;
}
```
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
