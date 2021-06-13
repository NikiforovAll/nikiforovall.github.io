---
layout: post
title: Design Patterns. Behavioral Patterns. Part I
categories: [design-patterns]
tags: [dotnet, csharp, design-patterns, trydotnet]
shortinfo: Overview of behavioral patterns with Try.NET
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
- [Wrapping up](#wrapping-up)
<!-- - [Wrapping up](#wrapping-up) -->

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

![template-method](/assets/design-patterns/template-method-1.png)

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

Represent an operation to be performed on the elements of an object structure. Visitor lets you define a new operation without changing the classes of the elements on which it operates.

**Use case**

* When you want to split data structures and commands. Visitor pattern encourages to adhere OCP (S_O_LID).
* When you want to be able to add operations to stable hierarchy more easily. In OOP world it is easier to arrange object into hierarchy rather than adding new operation for existing hierarchy of objects. Adding new operation is considered as risky move since it is very likely to design fragile solution, Visitor allows to tackle this problem.

**Frequency of use:** Low

**Diagram**

![visitor-diagram](/assets/design-patterns/visitor-1.png)


**Examples in .NET**

* *ExpressionTreeVisitor* for working with Expression Trees in .NET.
* *DbExpressionVisitor* in EntityFramework in .NET.

---

Source code: [Visitor](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Visitor)

Example: [Try .NET](https://try.dot.net/?fromGist=b554979c03460d0db145a1177e75a331)

``` csharp
// Visitor impl
public class LogEntryVisitor: ILogEntryVisitor
{
    public string State { get; set; }
    public void ProcessLogEntry(LogEntry logEntry)
    {
        logEntry.Accept(this);
    }
    void ILogEntryVisitor.Visit(ExceptionLogEntry exceptionLogEntry)
    {
        State = $"LogEntryVisitor[{nameof(exceptionLogEntry)}]";
    }
    void ILogEntryVisitor.Visit(SimpleLogEntry simpleLogEntry)
    {
        State = $"LogEntryVisitor[{nameof(simpleLogEntry)}]";
    }
}
// Program
public class Program {
    public static void Main () {
        var baseEntry = new SimpleLogEntry () {
            Created = DateTime.Now,
            Message = "test"
        };

        var simpleEntry = new SimpleLogEntry (baseEntry) {
            AdditionalInfo = "additional"
        };

        var exceptionEntry = new ExceptionLogEntry (baseEntry) {
            ExceptionCode = 111
        };
        //it is possible to implement multiple visitors for particular hierarchy of objects
        // for example: PersistentLogEntryVisitors that allows to process LogEntries and save them to storage
        var visitor = new LogEntryVisitor ();
        visitor.ProcessLogEntry (simpleEntry);
        Assert.Contains ("simple", visitor.State);
        visitor.ProcessLogEntry (exceptionEntry);
        Assert.Contains ("exception", visitor.State);
        TestRunner.Print ();
    }
}
```

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## State

Allow an object to alter its behavior when its internal state changes. StateClient aggregates state internally and acts in according with current State.

**Use case**

* When you have a state machine to implement and you feel like the behavior will be changed at some point, so you want to have distinct point of extension.

**Frequency of use:** Medium

**Diagram**

![state](/assets/design-patterns/state-1.png)

**Example in .NET**

* *CommunicationObject* in WCF provides a common base implementation for the basic state machine common to all communication-oriented objects.
* *Task* implements state machine to move between statuses: Created, WaitingForActivation, WaitingToRun, Running, RunToCompletion, Canceled, Faulted.

---

Source code: [State](https://github.com/NikiforovAll/design-patterns-playground/tree/master/State).

Example: [Try .NET](https://try.dot.net/?fromGist=83b2cd57034abbaf53a0cb2f312eb5eb) (+ *INotifyPropertyChanged* to inspect how state changes intrinsically.)

``` csharp
public class StateOne : BaseState {

    public StateOne (StateClient client) {
        Client = client;
    }
    protected override void HandleContext () {
        //in general, state is changed based on rules defined within concrete implementation of state (same for StateTwo)
        if (base.IsNeedToChangeState ()) {
            Client.State = new StateTwo (this);
        }
    }
}
public abstract class BaseState {
    // ...
    public int Value { get; protected set; }
    public StateClient Client { get; set; }
    protected int Threshold { get; set; } = 1;

    public virtual bool IsNeedToChangeState () {
        return Value >= Threshold;
    }
    // ...
}
// Program
public class Program {
    public static void Main () {
        var ctx = new StateClient ();
        ctx.State = new StateOne (ctx);
        Assert.Equal ("StateOne", ctx.State.GetType ().Name);
        //Threshold is reached, lets change to StateTwo
        ctx.Process ();
        Assert.Equal ("StateTwo", ctx.State.GetType ().Name);
        ctx.Process ();
        ctx.Process ();
        //Threshold is reached, lets change to StateTwo.
        //Once again, rules could be defined within state (e.g. different value for threshold or something like that)
        Assert.Equal ("StateOne", ctx.State.GetType ().Name);
        TestRunner.Print ();
    }
}
```

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Mediator

Define an object that encapsulates how a set of objects interact. Mediator promotes loose coupling by keeping objects from referring to each other explicitly, and it lets you vary their interaction independently.

Mediator could be used at different level of application. It could be class as mediator, component as mediator, application-layer as mediator. For example, components could be connected in *Composition Root* by applying Mediator pattern.

**Use case**

* When you want to describe interaction between autonomous components in loose-coupled way. Implicit mediator vs explicit mediator.

**Frequency of use:** Medium

**Diagram**

![mediator](/assets/design-patterns/mediator-1.png)

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

Define a one-to-many dependency between objects so that when one object changes state, all its dependents are notified and updated automatically. Implementation could be based on push model, when clients is notified with all data needed or pull model, when clients are just notified and request data on demand.

It is hard to find classic interface based implementation of Observer in .NET because of presence of delegates (*EventHandler\<T\>*), events, *IObserver/IObserverable* and Reactive programming libs.

**Use case**

* Consider Observer when you have one-to-many dependency and you want to facilitate lose-coupling.
* When there is a complicated communication between collection of objects you could implement Mediator based on Observer.

**Frequency of use:** High

**Diagram**

![observer](/assets/design-patterns/observer-1.gif)

**Examples in .NET**

* *IObserver/IObserverable* in .NET.
* *AppDomainSetup.AppDomainInitializer*, *HttpConfiguration.Initializer* as a point of extension of the app during initialization.

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

Without violating encapsulation, capture and externalize an object's internal state so that the object can be restored to this state later.

**Use case**

* When you have distinct list of parameters that you want to manage and externalize for clients of your code.

**Frequency of use:** Low.

**Diagram**

![memento](/assets/design-patterns/memento-1.png)

---

Source code: [Memento](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Memento).

Example: [Try .NET](https://try.dot.net/?fromGist=7a6ff3003b8dbd66a340cebbb2857484)

``` csharp
public class Program {
    public static void Main () {
        (string, int) [] states = {
            ("1", 0),
            ("2", 10),
            ("3", 20),
        };
        Originator originator = new Originator ();
        var caretaker = new Caretaker ();

        originator.State = states[0];
        caretaker.Push (originator.CreateMemento ());
        originator.State = states[1];
        caretaker.Push (originator.CreateMemento ());
        originator.State = states[2];

        originator.SetMemento (caretaker.Pop ());
        Assert.Equal (states[1], originator.State);
        originator.SetMemento (caretaker.Pop ());
        Assert.Equal (states[0], originator.State);
        Assert.Empty (caretaker);
    }
}
```

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Iterator

Provide a way to access the elements of an aggregate object sequentially without exposing its underlying representation.

Iterators in .NET are unidirectional and lazy, every time you invoke *GetEnumerator()* new instance is returned. Also, iterators are mutable by default, so it is better to use struct iterators and save yourself from potential issues.

**Use case**

* Use iterator when you want to provide uniform way to perform custom and stateful iteration of a collection of objects.

**Frequency of use:** High

**Diagram**

![iterator](/assets/design-patterns/iterator-1.png)

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

Given a language, define a representation for its grammar along with an interpreter that uses the representation to interpret sentences in the language.

**Use case:**

* When you work with syntax trees that you want to evaluate in some way.

**Frequency of use:** Low

**Diagram**

![iterator](/assets/design-patterns/interpreter-1.png)

---

Source code: [Interpreter](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Interpreter).

Example: [Try .NET](https://try.dot.net/?fromGist=e956557d69c60096fa3bdbe3d5c686cc)

``` csharp
//Program
public class Program
{
    public static void Main()
    {
        var context = new Context();
        context.TerminalExpressionArgs = new TerminalExpression[] {
            new TerminalExpression(1),
            new TerminalExpression(2)
        };

        AbstractInterpreter[] interpreters = new AbstractInterpreter[]{
            new TerminalExpression(3),
            new NonTerminalExpression(){BinaryOperation = (a, b)=> a * b }
        };
        // terminal expression is multiplied based on default value from context
        // 3 * 2
        Assert.Equal(6, interpreters[0].Interpret(context));
        // (1 * 2) * (2 * 2)
        Assert.Equal(8, interpreters[1].Interpret(context));
        TestRunner.Print();
    }
}
```

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Command

Encapsulate a request as an object, thereby letting you parameterize clients with different requests, queue or log requests, and support undoable operations.

**Use case**

* When you want to encapsulate operation and detach it from originator.
* When you want to define granular contract between components and encourage ISP.

**Frequency of use:** Medium High

**Diagram**

![command](/assets/design-patterns/command-1.png)

**Examples in .NET**

* *ICommand* in WPF.
* *IDbCommand* in ADO.NET.
* *Task\<T\>* accepts *Func\<T\>*  so it could be interpreted as command.

---

Source code: [Command](https://github.com/NikiforovAll/design-patterns-playground/tree/master/Command).

Example: [Try .NET](https://try.dot.net/?fromGist=1738fcc2fe9636ef9a4e35f8f04dce26)

``` csharp
public class Program {
    public static void Main () {
        var operations = new List < (char @operator, int operand) > {
            ('+', 10),
            ('-', 5),
            ('*', 3)
        };
        CalculatorClient client = new CalculatorClient ();
        foreach (var operation in operations) {
            client.Compute (operation.@operator, operation.operand);
        }

        Assert.Equal (15, client.Result);
        client.Undo ();
        Assert.Equal (5, client.Result);
    }
}
```

<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## ChainOfResponsibility

Avoid coupling between the sender of a request to its receiver by giving more than one object a chance to handle the request. Chain the receiving objects and pass the request along the chain until an object handles it.

**Use case**

* When you have generalized request/event/operation to be processed by interested parties not know in advance. It is possible to change processing behavior at runtime.

**Frequency of use:** Medium

**Diagram**

![chain-of-responsibility](/assets/design-patterns/chain-of-responsibility-1.png)

**Examples in .NET**

* Event *Closing* in WinForms, so it possible to prevent form from closing by setting *Cancel*  argument in *CancelEventArgs*.

---

Source code: [ChainOfResponsibility](https://github.com/NikiforovAll/design-patterns-playground/tree/master/ChainOfResponsibility).

Example: [Try .NET](https://try.dot.net/?fromGist=74dc52cef68e13bdd9314b591d39fee2)

``` csharp
// Example of processor.
public class Director : Approver
{
    public Director(string id) :base (id)
    {
    }
    public override (bool, ProcessingLevel) ProcessRequest(Purchase purchase) =>
        purchase.Amount < 10 ? (true, ProcessingLevel.Accepted) : successor.ProcessRequest(purchase);
}
// Program
public static void Main () {
    List<Approver> approvers = new List<Approver> {
        new Director ("#1"),
        new VicePresident ("#2"),
        new President ("#3")
    };
    ChainOfResponsibilityManager manager = new ChainOfResponsibilityManager (
        new Dictionary<string, string> {
            ["#1"] = "#2",
            ["#2"] = "#3"
        }
    );
    var baseApprover = manager.CreateChainOfApprovers (approvers);

    Purchase purchase1 = (Purchase) (5.0, 1, "p1");
    Purchase purchase2 = (Purchase) (11.0, 1, "p1");
    Purchase purchase3 = (Purchase) (16.0, 1, "p1");
    Purchase purchase4 = (Purchase) (21.0, 1, "p1");

    // process is initiated by first node, conditions is not met so it stops.
    // Consider to externalize ChainOfResponsibility to client interface and use node registry to build chain.
    // In this case chain execution started from first node.
    var result1 = approvers[0].ProcessRequest (purchase1);
    Assert.Equal (ProcessingLevel.Accepted, result1.Item2);

    // process is initiated by first node. Control is passed to successor.
    var result2 = approvers[0].ProcessRequest (purchase2);
    Assert.Equal (ProcessingLevel.EscalationLevelOne, result2.Item2);

    // process is initiated by first node. Control is passed all the way to last node and processed successfully.
    var result3 = approvers[0].ProcessRequest (purchase3);
    Assert.Equal (ProcessingLevel.EscalationLevelTwo, result3.Item2);
    // end of ChainOfResponsibility
    var result4 = approvers[0].ProcessRequest (purchase4);
    Assert.Equal (false, result4.Item1);
    Assert.Equal (ProcessingLevel.Rejected, result4.Item2);
    TestRunner.Print ();
}
```
<!-- <iframe src="https://try.dot.net/?fromGist=" markdown = "0"></iframe> -->

## Wrapping up

And that's it. Let me know what you think and feel free to contribute to <https://github.com/NikiforovAll/design-patterns-playground>.
