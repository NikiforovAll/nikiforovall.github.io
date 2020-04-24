---
layout: post
title: Catch up with .NET Core - System.IO.Pipelines
categories: [dotnet-core]
tags: [.NET, dotnet-core-modern-api]
shortinfo: Quick reference and a collection of links to learn <b>System.IO.Pipelines</b>.
fullview: false
comments: true
link-list: https://www.theurlist.com/catch-up-with-dotnet-pipelines
---

## TL;DR

Introduction to **System.IO.Pipelines**. See *Reference* section for stuff you might find useful to delve in.

---

[System.IO.Pipelines](https://www.nuget.org/packages/System.IO.Pipelines/) is a library that is designed to make it easier to do high performance IO shipped in *.NET Standard 2.1* as a first class BCL API.

Provides programming model to perform high performance parsing of streaming data. Developers are free from having to manage buffers. A *Pipeline* is like a *Stream* that pushes data to you. Networking is the primary use case for this API, the whole thing emerged from Kestrel as implementation detail.

There are no explicit buffers allocated. All buffer management is delegated to the `PipeReader` and `PipeWriter` implementations. Delegating buffer management makes it easier for consuming code to focus solely on the business logic.

**Example from docs.microsoft:** <https://docs.microsoft.com/en-us/dotnet/standard/io/pipelines#pipe-basic-usage>

### Example: reading of buffered integers

On the high level it looks something like snippet below. *FillPipeAsync* is data source that uses writer object to manage buffer.

```csharp
static async Task Main(string[] args)
{
    var pipe = new Pipe(new PipeOptions(pauseWriterThreshold: 12, resumeWriterThreshold: 9));
    Task writing = FillPipeAsync(5, pipe.Writer);
    Task reading = ReadPipeAsync(pipe.Reader);
    await Task.WhenAll(reading, writing);
}
```

There are no explicit buffers allocated. All buffer management is delegated to the PipeReader and PipeWriter implementations. Delegating buffer management makes it easier for consuming code to focus solely on the business logic.

```csharp
private static async Task FillPipeAsync(
    int iterations, PipeWriter writer, CancellationToken token = default)
{
    const int minimumBufferSize = 4;
    var random = new Random();
    for (int i = 0; i < iterations; i++)
    {
        Memory<byte> memory = writer.GetMemory(minimumBufferSize);
        var numberToWrite = random.Next(int.MaxValue / 2, int.MaxValue);
        Console.WriteLine("Writing...");
        BitConverter.TryWriteBytes(memory.Span, numberToWrite);
        writer.Advance(minimumBufferSize); // Tell writer how much data were written
        FlushResult result = await writer.FlushAsync(); // Make the data available to the PipeReader.
    }
    await writer.CompleteAsync();
}
```

```csharp
private static async IAsyncEnumerable<ReadOnlySequence<byte>> GetReaderResult(
    PipeReader reader, [EnumeratorCancellation] CancellationToken token = default)
{
    while (true && !token.IsCancellationRequested)
    {
        ReadResult result = await reader.ReadAsync(); // Await reading
        ReadOnlySequence<byte> buffer = result.Buffer;
        if (buffer.Length < 4)
            yield break;
        var position = buffer.GetPosition(sizeof(int));
        Console.WriteLine("Reading...");
        yield return buffer.Slice(0, position);
        buffer = buffer.Slice(position);
        reader.AdvanceTo(buffer.Start, position); // Tell the PipeReader how much of the buffer has been consumed.
        if (result.IsCompleted) // Stop reading if there's no more data coming.
            break;
    }
    await reader.CompleteAsync(); // Mark the PipeReader as complete.
}
private static async Task ReadPipeAsync(PipeReader reader)
{
    await foreach (var bytesReceived in GetReaderResult(reader))
    {
        foreach (var i in bytesReceived.ToArray<byte>())
        {
            Console.Write($"{i:x3}.");
        }
        Console.WriteLine("!");
    }
}
```

Output:
```bash
$ dotnet run
Writing...
Writing...
Writing...
Reading...
00c.04d.04d.078.!
Reading...
Writing...
0eb.0d2.0f6.05f.!
Reading...
Writing...
06e.0ca.029.050.!
Reading...
085.0d0.0bd.043.!
Reading...
01d.074.08c.07b.!
```

See full example at GitHub: [blog-examples/pipelines](https://github.com/NikiforovAll/nikiforovall.blog.examples/tree/master/pipelines)

<!-- **Tackle backpressure:** <https://docs.microsoft.com/en-us/dotnet/standard/io/pipelines#backpressure-and-flow-control> -->

## Streams and pipes

`System.IO.Pipelines` was designed to make writing of high performance parsing of streaming data. The vast majority of API working with IO are written based on `System.IO.Stream`. To simplify this, BCL provides out of the box ways to converts between this types.

### Stream → Pipe

When working with a stream it is possible to create wrappers/adapters around *Stream*. Use
[PipeWriter.Create](https://docs.microsoft.com/en-us/dotnet/api/system.io.pipelines.pipewriter.create) / [PipeReader.Create](https://docs.microsoft.com/en-us/dotnet/api/system.io.pipelines.pipereader.create)

**Example:** <https://github.com/davidfowl/TcpEcho>

### Pipe → Stream

When reading or writing stream data, you typically read data using a de-serializer and write data using a serializer. Most of these read and write stream APIs have a Stream parameter. To make it easier `PipeReader` and `PipeWriter` expose an *AsStream*. *AsStream* returns a Stream implementation around the PipeReader or PipeWriter.
