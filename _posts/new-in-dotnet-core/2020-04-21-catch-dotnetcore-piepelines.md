---
layout: post
title: Catch up with .NET Core - System.IO.Pipelines
categories: [dotnet-core]
tags: [.NET, dotnet-core-new-api]
shortinfo: Quick reference and a collection of links to learn <b>System.IO.Pipelines</b>.
fullview: false
comments: true
link-list: https://www.theurlist.com/catch-up-with-dotnet-pipelines
---

### TL;DR

Quick reference and a collection of links to learn **System.IO.Pipelines**.

---

[System.IO.Pipelines](https://www.nuget.org/packages/System.IO.Pipelines/) is a library that is designed to make it easier to do high performance IO shipped in .NET Standard 2.1 as a first class BCL API.

Provides programming model to perform high performance parsing of streaming data. Developers are free from having to manage buffers. A *Pipeline* is like a *Stream* that pushes data to you. Networking is the primary use case for this API, the whole thing emerged from Kestrel as implementation detail.

There are no explicit buffers allocated. All buffer management is delegated to the `PipeReader` and `PipeWriter` implementations. Delegating buffer management makes it easier for consuming code to focus solely on the business logic.

**Simple example:** <https://docs.microsoft.com/en-us/dotnet/standard/io/pipelines#pipe-basic-usage>

**Tackle backpressure:** <https://docs.microsoft.com/en-us/dotnet/standard/io/pipelines#backpressure-and-flow-control>

### Stream → Pipe

When working with a stream it is possible to create wrappers/adapters around *Stream*. Use
[PipeWriter.Create](https://docs.microsoft.com/en-us/dotnet/api/system.io.pipelines.pipewriter.create) / [PipeReader.Create](https://docs.microsoft.com/en-us/dotnet/api/system.io.pipelines.pipereader.create)

**Example:** <https://github.com/davidfowl/TcpEcho>

### Pipe → Stream

When reading or writing stream data, you typically read data using a de-serializer and write data using a serializer. Most of these read and write stream APIs have a Stream parameter. To make it easier `PipeReader` and `PipeWriter` expose an *AsStream*. *AsStream* returns a Stream implementation around the PipeReader or PipeWriter.
