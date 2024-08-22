---
layout: post
title: "Building pipelines with IAsyncEnumerable in .NET"
categories: [ dotnet ]
tags: [ dotnet, async, pipelines ]
published: true
shortinfo: "This article demonstrates how to use IAsyncEnumerable and System.Linq.Async to build pipelines in C#."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Examples](#examples)
  - [Using `System.Linq.Async` operators to build a pipeline](#using-systemlinqasync-operators-to-build-a-pipeline)
  - [Combining `IAsyncEnumerable` with `IObservable`](#combining-iasyncenumerable-with-iobservable)
  - [Implementing reusable operators - `Batch`](#implementing-reusable-operators---batch)
  - [Implementing reusable domain-specific operators - `TextSummarization` with Semantic Kernel](#implementing-reusable-domain-specific-operators---textsummarization-with-semantic-kernel)
- [Conclusion](#conclusion)
- [References](#references)

This article demonstrates how to use `IAsyncEnumerable` and `System.Linq.Async` to build pipelines in C#.

**Source code**: <https://github.com/NikiforovAll/async-enumerable-pipelines>

You can see all demos by running:

```bash
dotnet example --list
```

```text
╭─────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────╮
│ Example                                 │ Description                                                                                │
├─────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ CalculateWordCountPipeline              │ Demonstrates how to build async-enumerable pipelines based on standard LINQ operators      │
│ CalculateWordCountFileWatcherPipeline   │ Demonstrates how to combine async-enumerable pipelines with IObservable. E.g: file watcher │
│ CalculateWordCountBatchPipeline         │ Demonstrates how to use batching in async-enumerable pipelines                             │
│ TextSummarizationAndAggregationPipeline │ Demonstrates how to build custom async-enumerable operators                                │
╰─────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────╯
```

Here's a sneak peek 👀:

```csharp
// TextSummarizationAndAggregationPipeline
var pipeline = Directory
    .EnumerateFiles(path)
    .ToAsyncEnumerable()
    .ReportProgress()
    .SelectAwait(ReadFile)
    .Where(IsValidFileForProcessing)
    .SelectAwait(Summarize)
    .WriteResultToFile(path: Path.Combine(Path.GetTempPath(), "summaries.txt"))
    .ForEachAsync(x => AnsiConsole.MarkupLine($"Processed [green]{x.Name}[/]"));
```

## Introduction

Pipelines are a powerful way to process data in a streaming fashion. They are a series of stages that transform data from one form to another. In this article, we will explore how to build pipelines using `IAsyncEnumerable` and `System.Linq.Async`.

Pipelines are a common pattern in modern software development. They are used to process data in a streaming fashion, which can be more efficient than processing it all at once. Pipelines are also composable, meaning that you can combine multiple stages together to create more complex processing logic.

💡 I already describe an approach to building pipelines in my previous blog post, you might want to take a look at [Building pipelines with System.Threading.Channels](https://nikiforovall.github.io/dotnet/async/2024/04/21/channels-composition.html). Both `System.Threading.Channels` and `IAsyncEnumerable` provide powerful tools for managing asynchronous data streams in .NET. However, while `System.Threading.Channels` offers a more explicit approach to handling producer-consumer scenarios, `IAsyncEnumerable` brings a more integrated and LINQ-friendly way to work with asynchronous sequences. Understanding the strengths and nuances of each can help you choose the right tool for your specific use case.

## Examples

There are many interesting concepts that I'm going to cover in this article. Let's start with the basics.

### Using `System.Linq.Async` operators to build a pipeline

Let's say we want to build a pipeline that reads files from a directory, parses them, and counts the number of words in each file.

This can be illustrated as follows:

<center>
    <div class="mermaid">
    graph LR;
        A[Read files] --> B[Parse files];
        B --> C[Count words];
        C --> D[Output results];
    </div>
</center>

🎯 Our goal is to represent each stage of the pipeline in the code using `IAsyncEnumerable` and `System.Linq.Async`.

`System.Linq.Async` is a library that provides asynchronous versions of LINQ operators. It allows you to work with `IAsyncEnumerable` in a similar way to how you would work with `IEnumerable`. It makes it easy to build pipelines.

Basically, you have control-flow described as chain of methods calls, and you can implement each stage of the pipeline as a separate method. In my opinion, it makes the code more readable and maintainable. The benefit of this approach is once you determine the stages of the pipeline, you can implement them independently and focus on the logic of each stage.

The process of parsing files can be implemented as follows:

```csharp
var path = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "Data");

var pipeline = Directory
    .EnumerateFiles(path)
    .ToAsyncEnumerable()
    .SelectAwait(ReadFile)
    .Where(IsValidFileForProcessing)
    .Select(CalculateWordCount)
    .OrderByDescending(x => x.WordCount)
    .ForEachAsync(Console.WriteLine);

await pipeline;
```

Everything starts with the conversion of `IEnumerable<string>` file paths to `IAsyncEnumerable<string>`.

💡 Alternatively, we could write our own method that returns `IAsyncEnumerable`, for example, we could easily swap the local file system with Azure Blob Storage. It means we can reuse the same pipeline with different data sources.

💡 Later, we will see that not only `IEnumerable` can be converted to `IAsyncEnumerable`, but also `IObservable`.

As you can see `System.Linq.Async` provides a set of extension methods that allow you to work with `IAsyncEnumerable` in a similar way to how you would work with `IEnumerable`. The `SelectAwait` method is used to asynchronously project each element of the sequence. The `Where` method is used to filter elements based on a predicate. The `OrderByDescending` method is used to sort the elements of the sequence in descending order. The `ForEachAsync` method is used to asynchronously iterate over the sequence.

It worth to point out that `ForEachAsync` is a terminal operation that triggers the execution of the pipeline. It is important to remember that `IAsyncEnumerable` is a cold sequence, meaning that it does not start processing until you start iterating over it.

Here are the building blocks of the pipeline:

```csharp
public static class Steps
{
    public static async ValueTask<FilePayload> ReadFile(string file)
    {
        var content = await File.ReadAllTextAsync(file);
        var name = Path.GetFileName(file);

        return new FilePayload(name, content);
    }

    public static bool IsValidFileForProcessing(FilePayload file) =>
        file is { Content.Length: > 0, Name: [.., 't', 'x', 't'] };

    public static WordCountPayload CalculateWordCount(FilePayload payload)
    {
        var words = payload.Content.Split(' ');

        return new(payload.Name, words.Length);
    }
}

public record FilePayload(string Name, string Content);
public record WordCountPayload(string Name, int WordCount);
```

Let's see the pipeline in action:

<center>
    <video src="https://github.com/user-attachments/assets/84c1e8a8-996d-4960-9b39-20e6bd1101a9" controls="controls" style="margin: 15px;" width="100%"/>
</center>

### Combining `IAsyncEnumerable` with `IObservable`

Let's say we want to use simple file watcher to monitor changes in the directory and trigger the pipeline when a new file is created or an existing file is modified.

```csharp
var fileWatcher = CreateFileObservable(path);

var pipeline = fileWatcher
    .TakeUntil(DateTimeOffset.Now.AddSeconds(15))
    .ToAsyncEnumerable()
    .SelectAwait(ReadFile)
    .Where(IsValidFileForProcessing)
    .Select(CalculateWordCount)
    .ForEachAsync(Console.WriteLine);
```

In this example, we use `IObservable` to monitor changes in the directory. We create an observable sequence of file paths using the `CreateFileObservable` method. We then use the `TakeUntil` operator to limit the duration of the sequence to 15 seconds. We convert the observable sequence to an asynchronous enumerable sequence using the `ToAsyncEnumerable` method. We then apply the same pipeline as before to process the files.

The `CreateFileObservable` method is implemented as follows:

```csharp
static IObservable<string> CreateFileObservable(string path) =>
    Observable.Create<string>(observer =>
    {
        var watcher = new FileSystemWatcher(path)
        {
            NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite,
            Filter = "*.*",
            EnableRaisingEvents = true
        };

        void onChanged(object sender, FileSystemEventArgs e)
        {
            try
            {
                observer.OnNext(e.FullPath);
            }
            catch (Exception ex)
            {
                observer.OnError(ex);
            }
        }

        watcher.Created += onChanged;
        watcher.Changed += onChanged;

        return () =>
        {
            watcher.Created -= onChanged;
            watcher.Changed -= onChanged;
            watcher.Dispose();
        };
    });
```

Let's see the pipeline in action:

In the demo below, I'm appending " word" to the end of the file content to trigger the pipeline.

<center>
    <video src="https://github.com/user-attachments/assets/56db32bd-a7e9-41ec-8706-eaf876750bb6" controls="controls" style="margin: 15px;" width="100%"/>
</center>

### Implementing reusable operators - `Batch`

Let's say we want to batch the processing of files to improve performance. We can implement a custom operator called `Batch` that groups elements of the sequence into batches of a specified size.

In the example above, we are reading files in batches in parallel. We are using the `Batch` operator to group files into batches of size 2. We then process each batch in parallel using the `ProcessEachAsync` method.

```csharp
const int batchSize = 2;

var pipeline = Directory
    .EnumerateFiles(path)
    .ToAsyncEnumerable()
    .Batch<string, FilePayload>(batchSize)
    .ProcessEachAsync(ReadFile)
    .Where(IsValidFileForProcessing)
    .Select(CalculateWordCount)
    .OrderByDescending(x => x.WordCount)
    .ForEachAsync(Console.WriteLine);

await pipeline;
```

In the example above, we are reading files in batches in parallel. We are using the `Batch` operator to group files into batches of size 2. We then process each batch in parallel using the `ProcessEachAsync` method.

💡 I will leave the implementation of the `Batch` operator as an exercise for the reader. Please check source code for the full implementation. <https://github.com/NikiforovAll/async-enumerable-pipelines/blob/main/Pipelines.Core/PipelineBuilderExtensions.cs>

Let's see the pipeline in action:

<center>
    <video src="https://github.com/user-attachments/assets/96cc653d-8b42-4779-b2f2-fce804f0160b" controls="controls" style="margin: 15px;" width="100%"/>
</center>

### Implementing reusable domain-specific operators - `TextSummarization` with Semantic Kernel

To demonstrate something more complex, let's say we want to summarize the content of the files using the [Semantic Kernel](https://github.com/microsoft/semantic-kernel) library. Summarization is a common task in natural language processing (NLP) that involves generating a concise representation of a text document.

```csharp
var pipeline = Directory
    .EnumerateFiles(path)
    .ToAsyncEnumerable()
    .ReportProgress()
    .SelectAwait(ReadFile)
    .Where(IsValidFileForProcessing)
    .SelectAwait(Summarize)
    .WriteResultToFile(path: Path.Combine(Path.GetTempPath(), "summaries.txt"))
    .ForEachAsync(x => AnsiConsole.MarkupLine($"Processed [green]{x.Name}[/]"));
```

In the example above, we are reading files, summarizing their content, and writing the results to a file. We are using the `ReportProgress` operator to report progress as each file is processed. We are using the `Summarize` operator to summarize the content of each file. We are using the `WriteResultToFile` operator to write the results to a file.

Before we move forward, let's see how the pipeline works in the demo below:

<center>
    <video src="https://github.com/user-attachments/assets/42c6eb97-7a11-4b89-857e-1ffb8e70073c" controls="controls" style="margin: 15px;" width="100%"/>
</center>

Now, we are ready to move forward and see the details of the implementation.

The `Summarize` method is implemented as follows:

```csharp
async ValueTask<SummarizationPayload> Summarize(FilePayload file)
{
    var prompt = """
        {{$input}}
        Please summarize the content above in 20 words or less:

        The output format should be: [title]: [summary]
        """;

    var result = await kernel.InvokePromptAsync(prompt, new KernelArguments() { ["input"] = file.Content });

    return new(file.Name, result.ToString());
}
```

Than we want to write the results to a file:

```csharp
public static async IAsyncEnumerable<SummarizationPayload> WriteResultToFile(
    this IAsyncEnumerable<SummarizationPayload> values,
    string path
)
{
    const int batchSize = 10;

    using var streamWriter = new StreamWriter(path, append: true);

    await foreach (var batch in values.Buffer(batchSize))
    {
        foreach (var value in batch)
        {
            await streamWriter.WriteLineAsync(value.Summary);

            yield return value;
        }

        await streamWriter.FlushAsync();
    }

    AnsiConsole.MarkupLine($"Results written to [green]{path}[/]");
}
```

💡 Note, `IAsyncEnumerable` is pull-based model. With this approach, each summary is read individually and appended to the end of the file. This means that results are continuously saved as each batch is processed by calling the `FlushAsync` method.

The `ReportProgress` method is quite interesting because it eagerly reads all elements of the sequence to determine the total count. It then reports progress as each element is processed.

```csharp
public static async IAsyncEnumerable<string> ReportProgress(this IAsyncEnumerable<string> values)
{
    var totalCount = await values.CountAsync();

    await foreach (var (value, index) in values.Select((value, index) => (value, index)))
    {
        yield return value;

        AnsiConsole
            .Progress()
            .Start(ctx =>
            {
                var task = ctx.AddTask($"Processing - {Path.GetFileName(value)}", true, totalCount);
                task.Increment(index + 1);
                task.StopTask();
            });
    }
}
```

💡 This is a good demonstration of leaky abstractions. Not all data sources can provide the full sequence immediately, so we need to be careful.

## Conclusion

That is it! 🙌 We have seen how to build pipelines using `IAsyncEnumerable` and `System.Linq.Async`. I hope you found this article helpful. If you have any questions or comments, please feel free to leave them below.

## References

- <https://learn.microsoft.com/en-us/archive/msdn-magazine/2019/november/csharp-iterating-with-async-enumerables-in-csharp-8>
- <https://github.com/dotnet/reactive>
- <https://github.com/microsoft/semantic-kernel/tree/main/dotnet/notebooks>