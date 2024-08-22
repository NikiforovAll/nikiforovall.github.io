---
layout: post
title: Building pipelines with System.Threading.Channels
categories: [ dotnet, async ]
tags: [ dotnet, aspnetcore, channels, async, TPL, pipelines ]
published: true
shortinfo: This post shows you how to build pipelines based on System.Threading.Channels and Open.ChannelExtensions
fullview: false
comments: true
related: true
mermaid: true
---

*Table of Contents*:
- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Building Pipeline. Pipeline Primitives](#building-pipeline-pipeline-primitives)
  - [Generator aka Producer](#generator-aka-producer)
  - [Transformer aka Producer/Consumer](#transformer-aka-producerconsumer)
  - [Multiplexer and Demultiplexer](#multiplexer-and-demultiplexer)
- [Use `Open.ChannelExtensions`](#use-openchannelextensions)
- [Conclusion](#conclusion)
- [References](#references)

## TL;DR

This post shows you how to build pipelines based on `System.Threading.Channels` and `Open.ChannelExtensions`.

> Source code: <https://github.com/NikiforovAll/channels-composition-and-otel/tree/main/src/Console>

## Introduction

Concurrent programming challenges can be effectively addressed using channels. Channels, as part of the `System.Threading.Channels` namespace, provide a powerful tool for efficient inter-component communication in your application, particularly when dealing with data streams. Channels are essentially a modern take on the classic producer-consumer problem, offering a robust, thread-safe solution for handling data flow. They are designed to be composed, allowing you to build complex, multi-stage pipelines that can process data concurrently.

The relationship between concurrency and parallelism is commonly misunderstood. In fact, two procedures being concurrent doesn’t mean that they’ll run in parallel. Concurrency is something that enables parallelism. On a single processor, two procedures can be concurrent, yet they won’t run in parallel. A concurrent program **deals** with a lot of things at once, whereas a parallel program **does** a lot of things at once.

A channel is a data structure that allows one thread to communicate with another thread. In .NET, this was usually done by using a synchronization/locking mechanism. Channels, on the other hand, can be used to send messages directly between threads without any external synchronization or locking required.

**Example**:

The code below demonstrates the basic usage of `Channel<T>`. It prints numbers from 0 to 4 in random order.

```csharp
var channel = Channel.CreateUnbounded<string>();

var consumer = Task.Run(async () =>
{
    await foreach (var message in channel.Reader.ReadAllAsync())
    {
        Console.WriteLine(message);
    }
});

var producer = Task.Run(async () =>
{
    for (int i = 0; i < 5; i++)
    {
        await Task.Delay(TimeSpan.FromSeconds(Random.Shared.Next(3)));
        await channel.Writer.WriteAsync($"Message {i}");
    }
    channel.Writer.Complete();
});

await Task.WhenAll(producer, consumer);
```

Think about this code in terms of the quote below:

> Don't communicate by sharing memory; share memory by communicating. (R. Pike)

## Building Pipeline. Pipeline Primitives

In software development, a pipeline is a sequence of steps or stages through which data or tasks flow. Each step in the pipeline performs a specific operation on the data or tasks and passes the result to the next step. Pipelines are commonly used to process data or perform a series of operations in a structured and efficient manner.

<img src="/assets/channels-composition/producer-consumer.png"/>

While the [Open.ChannelExtensions](https://github.com/Open-NET-Libraries/Open.ChannelExtensions) library already contains the necessary components for building concurrent pipelines, we will be building a **naive** implementation from scratch for *learning purposes*. This will allow us to gain a deeper understanding of the underlying concepts and mechanisms.

### Generator aka Producer

A generator is responsible for producing data that will be consumed by other parts of the pipeline. A generator is a crucial part of a pipeline based on `System.Threading.Channels`. It is the starting point of the pipeline, producing data that will be processed by subsequent stages.

The generator method `Generate<T>` in the provided code is a simple example of a generator. It takes an array of items of type `T` and produces an `IAsyncEnumerable<T>` sequence from them. This sequence can then be used as the source of data for a channel.

```csharp
public static async IAsyncEnumerable<T> Generate<T>(params T[] array)
{
    foreach (var item in array)
    {
        yield return item;
    }
}
```

The `Source<TOut>` method creates a channel from an `IAsyncEnumerable<TOut>` source. It creates an unbounded channel and returns the `ChannelReader` part of it, effectively turning the `IAsyncEnumerable` into a readable channel.

```csharp
public static ChannelReader<TOut> Source<TOut>(IAsyncEnumerable<TOut> source)
{
    var channel = Channel.CreateUnbounded<TOut>();

    Task.Run(async () =>
    {
        await foreach (var item in source)
        {
            await channel.Writer.WriteAsync(item);
        }

        channel.Writer.Complete();
    });

    return channel.Reader;
}
```

As result, we have a channel based on `IAsyncEnumerable` which is quite useful for many scenarios:

```csharp
var pipeline = Source(Generate(1, 2, 3));

await foreach (var item in pipeline.ReadAllAsync())
{
    System.Console.WriteLine(item);
}
```

Let's print the elements using a reusable method that traverses elements of the `ChannelReader`:

```csharp
public static async Task ForEach<TRead>(this ChannelReader<TRead> source, Action<TRead> action)
{
    await foreach (var item in source.ReadAllAsync())
    {
        action(item);
    }
}
```

So, the our simple example of pipeline looks like this:

```csharp
var pipeline = Source(Generate(1, 2, 3));

await pipeline.ForEach(System.Console.WriteLine);
```

And the output:

```bash
1
2
3
```

Assume we want to generate a sequence from 1 to 100, for that case I would suggest writing custom generator that simplifies working with source.

The `GenerateRange` method is another example of a generator. It generates a sequence of integers within a specified range and produces an `IAsyncEnumerable<int>` sequence from them.

```csharp
public static async IAsyncEnumerable<int> GenerateRange(Range range)
{
    int count = range.End.Value - range.Start.Value + 1;
    foreach (var item in Enumerable.Range(range.Start.Value, count))
    {
        yield return item;
    }
}
```

```csharp
var pipeline = Source(GenerateRange(1..100));

await pipeline.ForEach(System.Console.WriteLine);
```

### Transformer aka Producer/Consumer

The pipeline can be explained as a series of consumer/producer tasks, forming a stream of steps that may be executed concurrently or sequentially.

Let's say we want to square a sequence of elements:

```csharp
var pipeline = Source(GenerateRange(1..10))
    .CustomPipe(x => x*x);

await pipeline.ForEach(System.Console.WriteLine);
```

This code defines an extension method `CustomPipe` over `ChannelReader<TRead>` class. The `CustomPipe` method takes two type parameters, `TRead` and `TOut`. `TRead` is the type of data that the source channel reader reads, and `TOut` is the type of data that the resulting channel reader will produce. For each item read from the `source`, the `transform` function is called to transform the item to type `TOut`, and the transformed item is written to the new channel.

```csharp
public static ChannelReader<TOut> CustomPipe<TRead, TOut>(
        this ChannelReader<TRead> source,
        Func<TRead, TOut> transform
    )
    {
        var channel = Channel.CreateUnbounded<TOut>();

        Task.Run(async () =>
        {
            await foreach (var item in source.ReadAllAsync())
            {
                await channel.Writer.WriteAsync(transform(item));
            }

            channel.Writer.Complete();
        });

        return channel.Reader;
    }
```

As you may have noticed, it's not necessary for the pipeline step execution to return the same type as its result.

The code snippet below creates a pipeline that generates a range of numbers, applies a custom pipe operation to calculate the square of each number, and then formats the results into a string.

```csharp
var pipeline = Source(GenerateRange(1..10))
    .CustomPipe(x => (item: x, square: x * x))
    .CustomPipe(x => $"{x.item,2}^2 = {x.square,4}");

await pipeline.ForEach(System.Console.WriteLine);
```

And here is the result of the execution:

```bash
 1^2 =    1
 2^2 =    4
 3^2 =    9
 4^2 =   16
 5^2 =   25
 6^2 =   36
 7^2 =   49
 8^2 =   64
 9^2 =   81
10^2 =  100
```

In real-world scenarios, we often need to perform asynchronous tasks. Let's write a modification of `CustomPipe` method - `CustomPipeAsync` that takes `Func<TRead, ValueTask<TOut> transform` as parameter instead:

```csharp
public static ChannelReader<TOut> CustomPipeAsync<TRead, TOut>(
    this ChannelReader<TRead> source,
    Func<TRead, ValueTask<TOut>> transform
)
{
    var channel = Channel.CreateUnbounded<TOut>();

    Task.Run(async () =>
    {
        await foreach (var item in source.ReadAllAsync())
        {
            await channel.Writer.WriteAsync(await transform(item));
        }

        channel.Writer.Complete();
    });

    return channel.Reader;
}
```

```csharp
var pipeline = Source(GenerateRange(1..10))
    .CustomPipe(x => (item: x, square: x * x))
    .CustomPipeAsync(async x =>
    {
        await Task.Delay(x.square * 10); // some async work

        return x;
    })
    .CustomPipe(x => $"{x.item, 2}^2 = {x.square, 4}");

await pipeline.ForEach(System.Console.WriteLine);
```

The output remains the same (although with some delay between items during the output process):

```bash
 1^2 =    1
 2^2 =    4
 3^2 =    9
 4^2 =   16
 5^2 =   25
 6^2 =   36
 7^2 =   49
 8^2 =   64
 9^2 =   81
10^2 =  100
```

For our task it is not necessary to perform tasks one by one. So we need some way to process tasks concurrently.

### Multiplexer and Demultiplexer

A multiplexer (or muxer) is a concept that combines multiple input signals into one output signal. In the context of our pipeline, we can think of it as a function that takes multiple `ChannelReader<T>` instances and combines them into a single `ChannelReader<T>`.

On the other hand, a demultiplexer (or demuxer) is a concept that takes a single input and distributes it over several outputs. In our pipeline, it would be a function that takes a single `ChannelReader<T>` and splits it into multiple `ChannelReader<T>` instances.

Here's an example of how you might implement a multiplexer (remember naive approach 🙈):

```csharp
static ChannelReader<T> Merge<T>(params ChannelReader<T>[] inputs)
{
    var output = Channel.CreateUnbounded<T>();

    Task.Run(async () =>
    {
        async Task Redirect(ChannelReader<T> input)
        {
            await foreach (var item in input.ReadAllAsync())
                await output.Writer.WriteAsync(item);
        }

        await Task.WhenAll(inputs.Select(i => Redirect(i)).ToArray());
        output.Writer.Complete();
    });

    return output;
}
```

This code defines a method `Merge` that merges multiple input channels into a single output channel. Once all items have been read from all input channels and written to the output channel, the writer of the output channel is completed. This indicates that no more data will be written to the channel.

And here is how you might implement a demultiplexer:

```csharp
static ChannelReader<T>[] Split<T>(ChannelReader<T> ch, int n)
{
    var outputs = Enumerable.Range(0, n)
        .Select(_ => Channel.CreateUnbounded<T>())
        .ToArray();

    Task.Run(async () =>
    {
        var index = 0;
        await foreach (var item in ch.ReadAllAsync())
        {
            await outputs[index].Writer.WriteAsync(item);
            index = (index + 1) % n;
        }

        foreach (var output in outputs)
            output.Writer.Complete();
    });

    return outputs.Select(output => output.Reader).ToArray();
}
```

This code defines a method `Split` that splits the data from a single input channel into multiple output channels. For each item read from the input channel, the item is written to one of the output channels. The output channel that the item is written to is determined by the `index` variable, which is incremented for each item and then wrapped around to zero when it reaches `n`. This ensures that the items are distributed evenly across the output channels.

The interesting part is that we can add concurrent processing to `CustomPipeAsync` by introducing `maxConcurrency` parameter and using `Split` and `Merge` methods together like this:

```csharp
public static ChannelReader<TOut> CustomPipeAsync<TRead, TOut>(
    this ChannelReader<TRead> source,
    int maxConcurrency,
    Func<TRead, ValueTask<TOut>> transform
)
{
    var bufferChannel = Channel.CreateUnbounded<TOut>();

    var channel = Merge(Split(source, maxConcurrency));

    Task.Run(async () =>
    {
        await foreach (var item in channel.ReadAllAsync())
        {
            await bufferChannel.Writer.WriteAsync(await transform(item));
        }

        bufferChannel.Writer.Complete();
    });

    return bufferChannel.Reader;
}
```

The source channel is split into multiple channels using the `Split` method. The Split method divides the items from the source channel into multiple channels based on the specified `maxConcurrency`. This allows for concurrent processing of the items.

Here is the usage of `maxConcurrency` parameter:

```csharp
var pipeline = Source(GenerateRange(1..10))
    .CustomPipe(x => (item: x, square: x * x))
    .CustomPipeAsync(
        maxConcurrency: 2,
        async x =>
        {
            await Task.Delay(x.square * 10);

            return x;
        }
    )
    .CustomPipe(x => $"{x.item,2}^2 = {x.square,4}");

await pipeline.ForEach(System.Console.WriteLine);
```

And the output, note the order is no longer sequential, which is what we wanted:

```bash
 1^2 =    1
 3^2 =    9
 5^2 =   25
 7^2 =   49
 9^2 =   81
 2^2 =    4
 4^2 =   16
 6^2 =   36
 8^2 =   64
10^2 =  100
```

## Use `Open.ChannelExtensions`

Luckily, we don't need to worry about full-fledged implementation of pipeline primitives, `Open.ChannelExtensions` already has everything we need for building production-ready pipelines. Let's see how we can use it to reproduce the demo above:

```csharp
var pipeline = Source(GenerateRange(1..10))
    .Pipe(x => (item: x, square: x * x))
    .PipeAsync(
        maxConcurrency: 2,
        async x =>
        {
            await Task.Delay(x.square * 10);

            return x;
        }
    )
    .Pipe(x => $"{x.item,2}^2 = {x.square,4}");

await pipeline.ForEach(System.Console.WriteLine);
```

Basically, `Open.ChannelExtensions` provides `Pipe` and `PipeAsync` methods identical to the onces we've implemented above (but definitely more efficient).

The output:

```bash
 1^2 =    1
 2^2 =    4
 3^2 =    9
 4^2 =   16
 5^2 =   25
 6^2 =   36
 7^2 =   49
 8^2 =   64
 9^2 =   81
10^2 =  100
```

## Conclusion

In this blog post, we've learned a lot by building custom pipelines from scratch based on `System.Threading.Channels`. However, for real-world use, I recommend using `Open.ChannelExtensions` as it provides efficient and production-ready pipeline primitives.

## References

* <https://devblogs.microsoft.com/dotnet/an-introduction-to-system-threading-channels/>
* <https://deniskyashif.com/2019/12/08/csharp-channels-part-1/>
* <https://github.com/Open-NET-Libraries/Open.ChannelExtensions>
