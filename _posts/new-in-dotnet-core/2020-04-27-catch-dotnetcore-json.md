---
layout: post
title: Catch up with .NET Core - System.Text.JSON
categories: [dotnet-core]
tags: [dotnet, json]
shortinfo: Introduction to <b>System.Text.Json</b>.
fullview: false
published: true
comments: true
link-list: https://www.theurlist.com/catch-up-with-dotnent-system-text-json
---

## TL;DR

Introduction to **System.Text.Json**. Basically, the article is a projection of documentation from microsoft docs, you might want to skip this one 😛. It was created due to the habit of learning new stuff that I practice.

---

For a very long time *.NET Framework* didn't have a unanimous and centralized built-in API to work with [JSON](https://tools.ietf.org/html/rfc7159). Also, the way we work with JSON has shaped and evolved over time. So .NET team has added brand-new NuGet package [System.Text.Json](https://www.nuget.org/packages/System.Text.Json) with support of serialization of object to JSON text, deserialization to JSON text to objects, reading/writing JSON text encoded as UTF-8 and creation of in-memory JSON (DOM) objects. By default, strings .NET are represented by UTF-16 encoding. *System.Text.Json* avoids unnecessary transcoding by making use of *ref struct* and working with UTF-8 in place.

Also, **System.Text.Json** eliminates dependency on 3rd party library for *ASP .NET Core*. Application developers still could easily use *Json.NET*, but this time there is not dependency between underlying platform and application code.

#### Examples. JSON ↔ POCO

Excessive description how to serialize could be found at:

* <https://docs.microsoft.com/en-us/dotnet/standard/serialization/system-text-json-how-to#serialization-behavior>
* <https://docs.microsoft.com/en-us/dotnet/standard/serialization/system-text-json-how-to#deserialization-behavior>.

```csharp
private static void SerializePrettyPrint()
{
    var payload = new DataPayload()
    {
        Id = 1,
        Type = Type.Root,
        Descendants = new DataPayload[]{
            new DataPayload(){Id = 2, Type = Type.Standard}
        }
    };
    var options = new JsonSerializerOptions
    {
        WriteIndented = true,
        AllowTrailingCommas = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        IgnoreNullValues = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };
    string payloadAsText = JsonSerializer.Serialize(payload, options);
    Trace.TraceInformation(payloadAsText);
    var payload2 = JsonSerializer.Deserialize<DataPayload>(payloadAsText, options);
    Debug.Assert(payload2.Id == payload.Id, "same id");
    Debug.Assert(payload2.Type == Type.Root, "same id");
}
```

#### Examples. Utf8JsonReader, Utf8JsonWriter

* <https://docs.microsoft.com/en-us/dotnet/standard/serialization/system-text-json-how-to#use-utf8jsonreader>
* <https://docs.microsoft.com/en-us/dotnet/standard/serialization/system-text-json-how-to#use-utf8jsonwriter>
* <https://docs.microsoft.com/en-us/dotnet/standard/serialization/system-text-json-how-to#filter-data-using-utf8jsonreader>

#### Examples. JsonDocument

* <https://docs.microsoft.com/en-us/dotnet/standard/serialization/system-text-json-how-to#use-jsondocument-for-access-to-data>
* <https://docs.microsoft.com/en-us/dotnet/standard/serialization/system-text-json-how-to#use-jsondocument-to-write-json>

---
See full code at GitHub: [NikiforovAll/TextJsonDemo](https://github.com/NikiforovAll/nikiforovall.blog.examples/tree/master/TextJsonDemo)
