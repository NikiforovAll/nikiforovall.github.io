---
layout: post
title: Introduction to JMESPath - JSON processor you should definitely know
categories: [ dotnet ]
tags: [ dotnet, json ]
published: true
shortinfo: JMESPath is a powerful query language that enables processing of JSON payloads.
fullview: false
comments: true
related: false
mermaid: false
---

- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Demo](#demo)
- [Extensibility](#extensibility)
- [Summary](#summary)
- [References](#references)

## TL;DR

JMESPath is a powerful query language that enables processing of JSON payloads. It can be used in .NET, see [JmesPath.Net](https://github.com/jdevillard/JmesPath.Net).

Source code: <https://github.com/NikiforovAll/jmespath-demo>

## Introduction

JSON processing is a common task in the day-to-day work of developers. We are used to working with JSON, but, occasionally, we need something more dynamic and efficient than `System.Text.Json` and `Newtonsoft.Json`. [JMESPath](https://jmespath.org/) is a powerful query language that allows you to perform Map/Reduce tasks in a declarative and intuitive manner.

JMESPath is simple to use, the query itself is just a plain string. The benefit of this approach is that you can follow the inversion of control principle and give your users the control of writing JMESPath queries.

💡 For example, the Azure CLI [uses](https://learn.microsoft.com/en-us/cli/azure/query-azure-cli) the --query parameter to execute a JMESPath query on the results of commands.

```csharp
public sealed class JmesPath
{
    public string Transform(string json, string expression);
}
```

## Demo

Read a random example of JSON string from a file:

```csharp
var source = new StreamReader("./example.json").ReadToEnd();
```

The content of the file:

```json
{
  "_id": "63ba60670fe420f2fb346866",
  "isActive": true,
  "balance": "$2,285.51",
  "age": 20,
  "eyeColor": "blue",
  "name": "Eva Sharpe",
  "email": "evasharpe@zaggles.com",
  "phone": "+1 (950) 479-2130",
  "registered": "2023-01-08T08:07:44.1787922+00:00",
  "latitude": 46.325291,
  "longitude": 5.211461,
  "friends": [
    {
      "id": 0,
      "name": "Nielsen Casey",
      "age": 19
    },
    {
      "id": 1,
      "name": "Carlene Long",
      "age": 38
    }
  ]
}
```

The code below shows the processing of the example payload above. It demonstrates different concepts such as projections, filtering, aggregation, type transformation, etc. I think the syntax is quite intuitive and doesn't need an explanation.

The processing is quite simple:

```csharp
var expressions = new (string, string)[]
{
    ("scalar", "balance"),
    ("projection", "{email: email, name: name}"),
    ("functions", "to_string(latitude)"),
    ("arrays", "friends[*].name"),
    ("filtering", "friends[?age > `20`].name"),
    ("aggregation", "{sum: sum(friends[*].age), names: join(',', friends[*].name)}"),
    ("now. ISO 8601", "now()"),
    ("now. Universal sortable date/time pattern", "now('u')"),
    ("now. Long date pattern", "now('D')"),
    ("format", "date_format(registered, 'd')"),
};

foreach (var (exampleName, expression) in expressions)
{
    var result = parser.Transform(source, expression);
}
```
<center>
 <img src="/assets/jmespath-intro/output.png">
</center>

## Extensibility

The cool thing about JMESPath is it provides a way to add custom functions. See more details: <https://github.com/jdevillard/JmesPath.Net/issues/81>

For example, here is how we can write `now()` function that accepts .NET string format provider, see the Microsoft docs <https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-date-and-time-format-strings>.

```csharp
public class NowFunction : JmesPathFunction
{
    private const string DefaultDateFormat = "o";

    public NowFunction() : base("now", minCount: 0, variadic: true) { }

    public override JToken Execute(params JmesPathFunctionArgument[] args)
    {
        var format = args is { Length: > 0 } x
            ? x[0].Token
            : DefaultDateFormat;

        return new JValue(DateTimeOffset.UtcNow.ToString(format.ToString()));
    }
}
```

## Summary

As you can see, JMESPath solves the issues of dynamic JSON processing based on user input quite nicely. It has an extensibility model that opens tons of possibilities.

## References

- <https://jmespath.org/>
- <https://github.com/jdevillard/JmesPath.Net>
- <https://github.com/NikiforovAll/jmespath-demo>
- <https://learn.microsoft.com/en-us/cli/azure/query-azure-cli>
