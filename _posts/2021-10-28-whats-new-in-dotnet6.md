---
layout: post
title: What's new in .NET 6 and C# 10. Everything you wanted to know.
categories: [ dotnet, csharp, coding-stories ]
tags: [ dotnet, csharp, coding-stories ]
published: true
shortinfo: See how you can set up your reproducible development environment based on devcontainers without extra hustle.
fullview: false
comments: true
hide-related: false
---

## TL;DR

This blog post is a compilation of latest and greatest additions from .NET 6 release. Also, I've created a coding story that will help you to learn new improvements.

![minimal-api-banner](/assets/minimal-api/minimal-api-fun.png)

---

Please check the coding story 👇:

> https://gitlab.com/NikiforovAll/whats-new-in-dotnet6

// TODO: add coding story print screen
// replace source code to github

Source code 👇:

> https://gitlab.com/NikiforovAll/whats-new-in-dotnet6

Also, see my blog post. It explains how to run .NET 6 inside devcontainer: <https://nikiforovall.github.io/productivity/devcontainers/2021/10/14/devcontainer-for-dotnet6.html>

---

- [Part 1. C# 10](#part-1-c-10)
  - [Global usings](#global-usings)
    - [Reference](#reference)
  - [File-scoped namespaces](#file-scoped-namespaces)
    - [Reference](#reference-1)
  - [Record structs](#record-structs)
    - [Reference](#reference-2)
- [Part 2. .NET API](#part-2-net-api)
  - [Minimal API](#minimal-api)
    - [Reference](#reference-3)
  - [LINQ Improvements](#linq-improvements)
    - [Reference](#reference-4)
  - [Parallel.ForEachAsync](#parallelforeachasync)
    - [Reference](#reference-5)
  - [PeriodicTimer](#periodictimer)
  - [Priority Queue](#priority-queue)
    - [Reference](#reference-6)
  - [DateOnly and TimeOnly](#dateonly-and-timeonly)
  - [System.Text.Json](#systemtextjson)
  - [Summary](#summary)

⚠👀 Please note that content below consist of excerpts from actual coding story. Please check the coding story if you haven't already.

# Part 1. C# 10

Full list of changes:

* <https://docs.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-10>
* <https://devblogs.microsoft.com/dotnet/announcing-net-6-release-candidate-2/>

Also, see:

* Every feature added in C# 10 with examples by NickChapsas <https://www.youtube.com/watch?v=Vft4QDUpyWY&ab_channel=NickChapsas>
* <https://devblogs.microsoft.com/dotnet/new-dotnet-6-apis-driven-by-the-developer-community/>
* <https://www.infoworld.com/article/3608611/whats-new-in-microsoft-net-6.html>

## Global usings

```csharp
global using global::System;
global using global::System.Collections.Generic;
global using global::System.IO;
global using global::System.Linq;
global using global::System.Net.Http;
global using global::System.Threading;
global using global::System.Threading.Tasks;

global using static System.Console;
global using static System.Math;
```

```csharp
WriteLine(Sqrt(3 * 3 + 4 * 4));
```

```bash
$ dotnet run 
5
```

### Reference

* <https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/using-directive#global-modifier>
* <https://docs.microsoft.com/en-us/dotnet/core/compatibility/sdk/6.0/implicit-namespaces#new-behavior>
* <https://www.hanselman.com/blog/implicit-usings-in-net-6>
* <https://dotnetcoretutorials.com/2021/08/31/implicit-using-statements-in-net-6/>

## File-scoped namespaces

```csharp
// IProductRepository.cs
namespace MyNamespace;

public interface IProductRepository
{
    Task<Product> GetProductAsync(int id);
}

public record class Product(int Id, string Name, ProductWarranty Warranty);
```

```csharp
// Program.cs
using MyNamespace;

var repository = new ProductRepository();
var product = await repository.GetProductAsync(Parse(args[0]));
WriteLine(product);
```

```bash
$ dotnet run 12
Product { Id = 1, Name = Name, Warranty = OneYear }
```

### Reference

* <https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/namespace>
* <https://ardalis.com/dotnet-format-and-file-scoped-namespaces/>
* <https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-10.0/file-scoped-namespaces>

## Record structs

```csharp
public record class Point(double X, double Y, double Z);

// public record class Point
// {
//     public double X {  get; init; }
//     public double Y {  get; init; }
//     public double Z {  get; init; }
// }

public readonly record struct Point2(double X, double Y, double Z);

// public record struct Point2
// {
//     public double X {  get; init; }
//     public double Y {  get; init; }
//     public double Z {  get; init; }
// }

public record struct Point3(double X, double Y, double Z);

// public record struct Point3
// {
//     public double X { get; set; }
//     public double Y { get; set; }
//     public double Z { get; set; }
// }
```

### Reference

* <https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record>

# Part 2. .NET API

➕ `System.Numerics.BitOperations`

## Minimal API

```csharp
// ================================================================
// Main Components
// ================================================================

// WebApplication
public static Microsoft.AspNetCore.Builder.WebApplicationBuilder CreateBuilder ();
// WebApplicationBuilder
public Microsoft.AspNetCore.Builder.WebApplication Build ();
// WebApplication
public void Run (string? url = default);
```

```csharp
var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;

services
    .AddEndpointsApiExplorer()
    .AddSwaggerGen();

var app = builder.Build();
app
    .UseSwagger()
    .UseSwaggerUI();

app.MapGet("ka/{pow}", (int pow) => IsPow2(pow));

app.Run();
```

```bash
$ dotnet run
Building...
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: https://localhost:7225
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5069
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Development
info: Microsoft.Hosting.Lifetime[0]
      Content root path: D:\home\dev\codingstories\whats-new-in-dotnet6\MinimalAPI
```

### Reference

* Minimal APIs at a glance by davidfowl <https://gist.github.com/davidfowl/ff1addd02d239d2d26f4648a06158727>
* Migration to ASP.NET Core in .NET 6 by davidfowl <https://gist.github.com/davidfowl/0e0372c3c1d895c3ce195ba983b1e03d>
* <https://andrewlock.net/series/exploring-dotnet-6/>
* <https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.builder.webapplicationbuilder?view=aspnetcore-6.0>
* <https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.builder.webapplication?view=aspnetcore-6.0>
* <https://github.com/martincostello/dotnet-minimal-api-integration-testing>
* <https://nikiforovall.github.io/dotnet/aspnetcore/2021/09/10/opinionated-minimal-api.html>

## LINQ Improvements

```csharp
using Bogus;
var faker = new OrderFaker();
var orders = faker.Generate(100);

// ================================================================
Header("Chunking");
// ================================================================

foreach (var chunk in orders.Chunk(25))
{
    var sum = chunk.Sum(o => o.Quantity);

    WriteLine($"chunk[{chunk.Length}].Quantity={sum}");
}
```

```bash
Chunking
chunk[25].Quantity=154
chunk[25].Quantity=138
chunk[25].Quantity=119
chunk[25].Quantity=138
```

```csharp
// ================================================================
Header("Index Support for ElementAt");
// ================================================================

var order1 = orders.ElementAt(^5);

WriteLine(order1);
```

```bash
Index Support for ElementAt
Order { OrderId = 15, Address = 604 Leffler Glens, Romaport, Cape Verde, Quantity = 2, Index = 96 }
```

```csharp
// ================================================================
Header("Range Support for Take");
// ================================================================

var orders2 = orders.Take(^5..);

WriteLine(string.Join(Environment.NewLine, orders2));
```

```bash
Range Support for Take
Order { OrderId = 15, Address = 604 Leffler Glens, Romaport, Cape Verde, Quantity = 2, Index = 96 }
Order { OrderId = 8, Address = 35694 Cummings Ville, Turnerville, Republic of Korea, Quantity = 5, Index = 97 }
Order { OrderId = 13, Address = 8711 Vita Burgs, East Jamaalberg, Zambia, Quantity = 4, Index = 98 }
Order { OrderId = 83, Address = 11506 Skiles Curve, Lake Abbeychester, Suriname, Quantity = 8, Index = 99 }
Order { OrderId = 89, Address = 9444 Schamberger Burgs, Wisokyland, Costa Rica, Quantity = 2, Index = 100 }
```

```csharp
// ================================================================
Header("Three way zipping");
// ================================================================

string[] a1 = { "1", "2", "3" };
string[] a2 = { "One", "Two", "Three" };
float[] a3 = { 1f, 2f, 3f };

foreach ((string i, string i2, float i3) in a1.Zip(a2, a3))
{
    WriteLine($"{i}-{i2}-{i3}");
}
```

```bash
Three way zipping
1-One-1
2-Two-2
3-Three-3
```

```csharp
// ================================================================
Header("Default Parameters for Common Methods");
// ================================================================

var order2 = orders.FirstOrDefault(
    o => o.Address.Contains("Odesa"), defaultValue: orders.ElementAt(^10));

WriteLine(order2);
```

```bash
Default Parameters for Common Methods
Order { OrderId = 14, Address = 49026 Huels Groves, Armandville, Bhutan, Quantity = 3, Index = 91 }
```

```csharp
// ================================================================
Header("Avoiding Enumeration with TryGetNonEnumeratedCount");
// ================================================================

if (orders.TryGetNonEnumeratedCount(out int count))
    WriteLine($"The count is {count}");
```

```bash
Avoiding Enumeration with TryGetNonEnumeratedCount
The count is 100
```

```csharp
// ================================================================
Header("MaxBy and MinBy");
// ================================================================

WriteLine(orders.MaxBy(o => o.Quantity));
```

```bash
MaxBy and MinBy
Order { OrderId = 16, Address = 30901 Madilyn Meadow, Lake Marlenfort, Malawi, Quantity = 10, Index = 2 }
```

### Reference

* 7 awesome improvements for LINQ in .NET 6 by NickChapsas <https://www.youtube.com/watch?v=sIXKpyhxHR8&t=1s&ab_channel=NickChapsas>

## Parallel.ForEachAsync

➕ `Task.WaitAsync`

➕ `Random.Shared`

```csharp
public static Task ForEachAsync<TSource>(
    IAsyncEnumerable<TSource> source,
    Func<TSource, CancellationToken, ValueTask> body);

public static Task ForEachAsync<TSource>(
    IEnumerable<TSource> source,
    Func<TSource, CancellationToken, ValueTask> body);
```

```csharp
await Parallel.ForEachAsync(Generate(), Handle)
    .WaitAsync(TimeSpan.FromMilliseconds(200))
    .ContinueWith(Report);

static async IAsyncEnumerable<int> Generate()
{
    while (true)
    {
        var delay = Random.Shared.Next(100);
        WriteLine($"Issued {delay}");
        await Task.Delay(delay);
        yield return delay;
    }
}

static async ValueTask Handle(int i, CancellationToken ct)
{
    await Task.Delay(i, ct);
    WriteLine($"Handled {i}");
}

static void Report(Task t) => WriteLine(
    $"Finished at: {DateTime.Now:T}, task.Status {t.Status}");
```

```bash
$ dotnet run
Issued 56
Issued 23
Issued 81
Handled 23
Handled 56
Issued 75
Finished at: 10:59:08 PM, task.Status Faulted
```

### Reference

* <https://www.hanselman.com/blog/parallelforeachasync-in-net-6>

## PeriodicTimer

➕ `ArgumentNullException.ThrowIfNull`

```csharp
using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));

while (await timer.WaitForNextTickAsync())
{
    LogEntry? l = Random.Shared.Next(128) is int r && IsPow2(r)
        ? default
        : new(r);

    ProcessLogEntry(l);
}

static void ProcessLogEntry(LogEntry? entry)
{
    ArgumentNullException.ThrowIfNull(entry, nameof(entry));
    WriteLine(entry);
}

public record class LogEntry(int Value);
```

```bash
$ dotnet run
LogEntry { Value = 104 }
LogEntry { Value = 115 }
LogEntry { Value = 21 }
LogEntry { Value = 110 }
LogEntry { Value = 106 }
LogEntry { Value = 63 }
LogEntry { Value = 81 }
Unhandled exception. System.ArgumentNullException: Value cannot be null. (Parameter 'entry')
   at System.ArgumentNullException.Throw(String paramName)
   at System.ArgumentNullException.ThrowIfNull(Object argument, String paramName)
   at Program.<<Main>$>g__ProcessLogEntry|0_0(LogEntry entry) in PeriodicTimer\Program.cs:line 18
   at Program.<Main>$(String[] args) in PeriodicTimer\Program.cs:line 12
   at Program.<Main>(String[] args)
```

## Priority Queue

```csharp
var queue = new PriorityQueue<Job, int>(ReverseComparer<int>.Default);

foreach (var i in 10)
{
    var p = Random.Shared.Next(100);
    queue.Enqueue(new($"Job{i}", p), p);
}

using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(500));

while (await timer.WaitForNextTickAsync())
{
    if (!queue.TryDequeue(out var job, out _))
        break;

    WriteLine(job);
}

public record struct Job(string Name, int Priority);

public sealed class ReverseComparer<T> : IComparer<T>
{
    public static readonly ReverseComparer<T> Default = new(Comparer<T>.Default);

    public static ReverseComparer<T> Reverse(IComparer<T> comparer) =>
        new ReverseComparer<T>(comparer);

    private readonly IComparer<T> comparer = Default;

    private ReverseComparer(IComparer<T> comparer) =>
        this.comparer = comparer;

    public int Compare(T? x, T? y) => comparer.Compare(y, x);
}

public static class ProduceNumericEnumeratorExtensions
{
    public static IEnumerator<int> GetEnumerator(this int number)
    {
        for (var i = 0; i < number; i++)
        {
            yield return i;
        }
    }
}
```

```bash
$ dotnet run 
Job { Name = Job1, Priority = 75 }
Job { Name = Job5, Priority = 66 }
Job { Name = Job2, Priority = 61 }
Job { Name = Job0, Priority = 58 }
Job { Name = Job4, Priority = 53 }
Job { Name = Job9, Priority = 34 }
Job { Name = Job7, Priority = 34 }
Job { Name = Job3, Priority = 29 }
Job { Name = Job8, Priority = 17 }
Job { Name = Job6, Priority = 8 }
```

### Reference

* <https://docs.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2?view=net-6.0>
* <https://dotnetcoretutorials.com/2021/03/17/priorityqueue-in-net/>

## DateOnly and TimeOnly

```csharp
DateOnly date = DateOnly.MinValue;
Log(date, nameof(date)); //Outputs 01/01/0001 (With no Time)

TimeOnly time = TimeOnly.MinValue;
Log(time, nameof(time)); //Outputs 12:00 AM

TimeOnly startTime = TimeOnly.Parse("11:00 PM");
var hoursWorked = 2;
var endTime = startTime.AddHours(hoursWorked);
Log(endTime, nameof(endTime)); //Outputs 1:00 AM

var isBetween = TimeOnly.Parse("12:00 AM").IsBetween(startTime, endTime); 

Log(isBetween, nameof(isBetween)); //Outputs true.

static void Log<T>(T value, string name = "") => WriteLine($"{name} {value}");
```

```bash
$ dotnet run 
date 1/1/0001
time 12:00 AM
endTime 1:00 AM
isBetween True
```

## System.Text.Json

```csharp
// ================================================================
Header("Serialization Notification");
// ================================================================

string invalidOrderJson = "{}";

var success = IgnoreErrors(() => JsonSerializer.Deserialize<Order2>(invalidOrderJson));
WriteLine($"Exception thrown: {!success}");

// IJsonOnDeserialized, IJsonOnDeserializing, IJsonOnSerialized, IJsonOnSerializing
public record class Order2 : Order, IJsonOnDeserialized
{
    public void OnDeserialized() => this.Validate();

    private void Validate()
    {
        if (this.OrderId <= 0)
            throw new ArgumentException();
    }
}

public record class Order
{
    public int OrderId { get; init; }
    public string Address { get; init; }
    public int Quantity { get; init; }
}

static bool IgnoreErrors(Action operation)
{
    if (operation == null)
        return false;

    try
    {
        operation.Invoke();
    }
    catch
    {
        return false;
    }

    return true;
}
```

```bash
$ dotnet run 
Serialization Notification
Exception thrown: True
```

```csharp
// ================================================================
Header("Property Ordering");
// ================================================================

Order3 order = new()
{
    OrderId = 1,
    Address = "Address",
    Quantity = 1,
    Comments = new() { "Cool", "Awesome" }
};
var serializedOrder = JsonSerializer.Serialize(order, options);
WriteLine(serializedOrder);

public record class Order3
{
    [JsonPropertyOrder(-1)]
    public int OrderId { get; init; }

    [JsonPropertyOrder(1)]
    public string Address { get; init; }

    [JsonPropertyOrder(2)]
    public int Quantity { get; init; }

    [JsonPropertyOrder(99)]
    public List<string> Comments { get; init; }
}
```

```bash
$ dotnet run 
Property Ordering
{
  "OrderId": 1,
  "Address": "Address",
  "Quantity": 1,
  "Comments": [
    "Cool",
    "Awesome"
  ]
}
```

```csharp
// ================================================================
Header("IAsyncEnumerable support && Working with Streams");
// ================================================================

var data = new { Data = RangeAsync(1, 5) };

// SerializeAsync
using var stream = new MemoryStream();
await JsonSerializer.SerializeAsync(stream, RangeAsync(1, 5), options);
stream.Position = 0;

// DeserializeAsyncEnumerable
await foreach (var i in JsonSerializer.DeserializeAsyncEnumerable<int>(stream, options))
{
    WriteLine(i);
}

static async IAsyncEnumerable<int> RangeAsync(int start, int count)
{
    for (int i = 0; i < count; i++)
    {
        await Task.Delay(i);
        yield return start + i;
    }
}
```

```bash
$ dotnet run 
1
2
3
4
5
```

```csharp
// ================================================================
Header("Working with JSON DOM");
// ================================================================

// Parse
var node = JsonNode.Parse(serializedOrder);

WriteLine($"OrderId: {node["OrderId"].GetValue<int>()}");
WriteLine($"Order.Comments[0]: {node["Comments"][0].GetValue<string>()}");

// Create DOM Object via API
var jObjectOrder = new JsonObject
{
    ["OrderId"] = 1,
    ["Discounts"] = new JsonArray(
        new JsonObject
        {
            ["DiscountId"] = 1,
            ["Value"] = .05,
        },
        new JsonObject
        {
            ["DiscountId"] = 2,
            ["Value"] = .1,
        }
    ),
};

WriteLine(jObjectOrder.ToJsonString(options));
```

```bash
OrderId: 1
Order.Comments[0]: Cool
{
  "OrderId": 1,
  "Discounts": [
    {
      "DiscountId": 1,
      "Value": 0.05
    },
    {
      "DiscountId": 2,
      "Value": 0.1
    }
  ]
}
```

## Summary

Thank you very much. I appreciate you coming this far 👍.
