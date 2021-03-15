---
layout: post
title: Task-based asynchronous Pattern and Composition (aka Task Combinators)
categories: [  dotnet, async ]
tags: [ dotnet, async, TPL ]
published: true
shortinfo: WhenAll, WhenAny, ForEachAsync, Throttling, Process as complete, etc.
fullview: false
comments: true
hide-related: false
link-list: https://www.theurlist.com/tap-composition
---

## TL;DR

Concurrency with TPL is fairly simple. In this blog post, I will reiterate over fundamentals and share with you some common patterns that you could use to compose your solutions. This blog post is focused on the concurrent processing of a collection of tasks and possible semantics that could be considered during the design of a solution.

Examples and source code can be found here: [nikiforovall.blog.examples/tap-composition](https://github.com/NikiforovAll/nikiforovall.blog.examples/tree/master/tap-composition)

---

## Part I: Fundamentals

The [Task](https://docs.microsoft.com/en-us/dotnet/api/system.threading.tasks.task) class provides a life cycle for asynchronous operations, and that cycle is represented by the `TaskStatus` enumeration. Exceptions occurring during the execution of an asynchronous method are assigned to the returned `Task`. If the cancellation request is honored such that work is ended prematurely, the `Task` returned from the TAP method will end in the `TaskStatus.Canceled` state. Finally, `await` operator unwraps the result of executing depending on `TaskStatus`.

Built-in task combinators: `Task.Run`, `Task.FromResult`, `Task.WhenAll`, `Task.WhenAny`, `Task.Delay`.

### Task.WhenAll & Task.WhenAny

`Task.WhenAll` returns a brand-new `Task`. It represents the final result of batch execution. If a cancellation (or exception) happens during `Task.WhenAll` the result will be in `TaskStatus.Canceled` (`TaskStatus.Faulted`), but other tasks are not terminated.

 The `Task.WhenAny` is used to asynchronously wait on multiple asynchronous operations represented as Tasks, asynchronously waiting for just one of them to complete. Unlike `Task.WhenAll`, which in the case of successful completion of all tasks returns a list of their unwrapped results, `Task.WhenAny` returns the `Task` that completed.

I suggest you investigate the behavior of [Task.WhenAll](#appendix---taskwhenall) and [Task.WhenAny](#appendix---taskwhenany) by exploring Unit Tests, so you understand how it behaves in certain scenarios.

## Part II: Combinators

Let's compare processing algorithms by the following qualities:

* Order of processing. Indicates how tasks are scheduled and executed relative to each other.
* Process as Complete. Describes how and when the results are processed.
* Throttled. Possibility to control the amount of workload at a given point in time.
* Batch Cancellation. Possibility to cancel other tasks in case of cancellation request.
* Interleaving. Isolated result processing.

### Vanilla Task.WhenAll

When`Task.WhenAll` is used on a collection of tasks, all tasks are run to completion, i.e.: [Task.IsCompleted](https://docs.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.iscompleted) = `true`. Results could be unwrapped from `Task<TResult[]>`.

<table class="table table-sm table-responsive table-striped table-hover">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Order of processing</th>
      <th scope="col">Process as Complete</th>
      <th scope="col">Throttled</th>
      <th scope="col">Batch Cancellation</th>
      <th scope="col">Interleaving</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>Task.WhenAll</code></td>
      <td>Concurrent ⭐</td>
      <td><code>false</code></td>
      <td><code>false</code></td>
      <td>Pass cancellation token to each task</td>
      <td>N/A, results are aggregated and it is up to implementor how to process them</td>
    </tr>
  </tbody>
</table>

E.g.:

```csharp
[Fact]
public async Task WhenAll_Result_Unwrapped()
{
    var job1 = RunJob(100, 1);
    var job2 = RunJob(300, 2);
    var whenAllTask = Task.WhenAll(job1, job2);
    var results = await whenAllTask;

    Assert.Equal(new int[] { 1, 2 }, results);
    Assert.True(whenAllTask.IsCompletedSuccessfully);
    Assert.Equal(TaskStatus.RanToCompletion, whenAllTask.Status);
}
```

Cancellation variation:

```csharp
[Fact]
public async Task WhenAll_SharedCancellationToken_AllCancelled()
{
    var cancellationTokenSource = new CancellationTokenSource(50);
    var t = cancellationTokenSource.Token;
    var job1 = RunJob(100, 1, t);
    var job2 = RunJob(150, 2, t);
    var job3 = RunJob(200, 3, t);
    List<Task> batch = new() { job1, job2, job3 };

    var whenAllTask = Task.WhenAll(batch);
    try
    { await whenAllTask; }
    catch { };

    Assert.All(batch, t => Assert.True(t.IsCanceled));
}
```

### Sequential ForEachAsync

Very simple implementation, just to demonstrate the different sides of the problem.

<table class="table table-sm table-responsive table-striped table-hover">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Order of processing</th>
      <th scope="col">Process as Complete</th>
      <th scope="col">Throttled</th>
      <th scope="col">Batch Cancellation</th>
      <th scope="col">Interleaving</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>SequentialBlockingForEachAsync</code></td>
      <td>Sequential</td>
      <td><code>false</code>, sequential nature of processing impedes this</td>
      <td><code>true</code>, not possible to control concurrency level</td>
      <td>N/A, easy to add on demand</td>
      <td><code>true</code> ⭐</td>
    </tr>
  </tbody>
</table>

```csharp
public static class SequentialBlockingForEachAsync
{
    public static async Task ForEachAsync<TResult, TSource>(
        this IEnumerable<TSource> list,
        Func<TSource, Task<TResult>> taskSelector,
        Action<TSource, TResult> resultProcessor)
    {
        foreach (var value in list)
        {
            resultProcessor(value, await taskSelector(value));
        }
    }
}
```

💡 Note, you can change the parameter `resultProcessor` to run continuation or adjust to your needs.

Run the code:

```csharp
private static IEnumerable<int> GenerateData()
{
    yield return 3;
    yield return 2;
    yield return 1;
}
[Benchmark]
public async Task SequentialBlocking() =>
    await GenerateData().ForEachAsync(async i =>
        {
            await Task.Delay(i * 100);
            return i;
        }, Empty);

private static void Empty<T>(T source, T result) { }

// |             Method |     Mean |   Error |  StdDev |
// |------------------- |---------:|--------:|--------:|
// | SequentialBlocking | 600.8 ms | 0.19 ms | 0.18 ms |
```

### Concurrent Interleaved ForEachAsync

The goal of this implementation is to achieve the maximum concurrency, but process results separate from each other:

Can be described as following: ([ref](https://devblogs.microsoft.com/pfxteam/implementing-a-simple-foreachasync/))

* For each element in an enumerable, run a function that returns a `Task{TResult}` to represent the completion of processing that element. All of these functions may run asynchronously concurrently.

* As each task completes, run a second processing action over the results.  All of these actions must be run sequentially, but order doesn’t matter.

<table class="table table-sm table-responsive table-striped table-hover">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Order of processing</th>
      <th scope="col">Process as Complete</th>
      <th scope="col">Throttled</th>
      <th scope="col">Batch Cancellation</th>
      <th scope="col">Interleaving</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>ConcurrentInterleavedForEachAsync</code></td>
      <td>Concurrent ⭐</td>
      <td><code>true</code></td>
      <td><code>false</code></td>
      <td>N/A, easy to add on demand</td>
      <td><code>true</code> ⭐</td>
    </tr>
  </tbody>
</table>

```csharp
public static class ConcurrentIsolatedForEachAsync
{
    public static Task ForEachAsync<TSource, TResult>(
        this IEnumerable<TSource> source,
        Func<TSource, Task<TResult>> taskSelector, Action<TSource, TResult> resultProcessor)
    {
        SemaphoreSlim oneAtATime = new(initialCount: 1, maxCount: 1);
        return Task.WhenAll(
            from item in source
            select ProcessAsync(item, taskSelector, resultProcessor, oneAtATime));
    }

    private static async Task ProcessAsync<TSource, TResult>(
        TSource item,
        Func<TSource, Task<TResult>> taskSelector, Action<TSource, TResult> resultProcessor,
        SemaphoreSlim oneAtATime)
    {
        TResult result = await taskSelector(item);
        await oneAtATime.WaitAsync();
        try
        { resultProcessor(item, result); }
        finally { oneAtATime.Release(); }
    }
}
```

💡 Note, you can change the parameter `resultProcessor` to run continuation or adjust to your needs.

Run the code:

```csharp
private static IEnumerable<int> GenerateData()
{
    yield return 3;
    yield return 2;
    yield return 1;
}
[Benchmark]
public async Task ConcurrentIsolated() =>
    await GenerateData().ForEachAsync(
        GenerateData(), async i =>
        {
            await Task.Delay(i * 100);
            return i;
        }, Empty);

private static void Empty<T>(T source, T result) { }

// |             Method |     Mean |   Error |  StdDev |
// |------------------- |---------:|--------:|--------:|
// | ConcurrentIsolated | 299.1 ms | 1.42 ms | 1.26 ms |
```

### Concurrent Interleaved Combinator

For those who don't like working with lambdas and `ForEach` LINQ operator. Personally, I really like this approach because it produces better stack traces.

<table class="table table-sm table-responsive table-striped table-hover">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Order of processing</th>
      <th scope="col">Process as Complete</th>
      <th scope="col">Throttled</th>
      <th scope="col">Batch Cancellation</th>
      <th scope="col">Interleaving</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>ConcurrentInterleavedCombinator</code></td>
      <td>Concurrent ⭐</td>
      <td><code>true</code></td>
      <td><code>false</code></td>
      <td>N/A, easy to add on demand</td>
      <td><code>true</code> ⭐</td>
    </tr>
  </tbody>
</table>

```csharp
public static class ConcurrentInterleavedCombinator
{
    public static Task<Task<T>>[] Interleaved<T>(IEnumerable<Task<T>> tasks)
    {
        var inputTasks = tasks.ToList();

        var buckets = new TaskCompletionSource<Task<T>>[inputTasks.Count];
        var results = new Task<Task<T>>[buckets.Length];
        for (var i = 0; i < buckets.Length; i++)
        {
            buckets[i] = new TaskCompletionSource<Task<T>>();
            results[i] = buckets[i].Task;
        }

        var nextTaskIndex = -1;
        void continuation(Task<T> completed)
        {
            var bucket = buckets[Interlocked.Increment(ref nextTaskIndex)];
            _ = bucket.TrySetResult(completed);
        }

        foreach (var inputTask in inputTasks)
        {
            _ = inputTask.ContinueWith(
                continuation,
                CancellationToken.None,
                TaskContinuationOptions.ExecuteSynchronously,
                TaskScheduler.Default);
        }

        return results;
    }
}
```

Here, we create `TaskCompletionSource<Task<T>>` instances to represent the buckets, one bucket per each of the tasks that will eventually complete. Then, we hook up a continuation to each input task. This continuation will get the next available bucket and store the newly completed task into it. [ref](https://devblogs.microsoft.com/pfxteam/processing-tasks-as-they-complete/)

Run the code:

```csharp
private static IEnumerable<int> GenerateData()
{
    yield return 3;
    yield return 2;
    yield return 1;
}

[Benchmark]
public async Task ConcurrentInterleavedCombinator()
{
    var tasks = GenerateData().Select(async i =>
    {
        await Task.Delay(i * 100);
        return i;
    });

    foreach (var bucket in Interleaved(tasks))
    {
        var t = await bucket;
    }
}

// |                          Method |     Mean |   Error |  StdDev |
// |-------------------------------- |---------:|--------:|--------:|
// | ConcurrentInterleavedCombinator | 299.4 ms | 1.01 ms | 0.94 ms |
```

### Throttled Interleaved WhenAll

Before this, we don't really have control over consumed resources. It is a common task to implement throttling, here is how you can do that.

<table class="table table-sm table-responsive table-striped table-hover">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Order of processing</th>
      <th scope="col">Process as Complete</th>
      <th scope="col">Throttled</th>
      <th scope="col">Batch Cancellation</th>
      <th scope="col">Interleaving</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>WhenAllThrottled</code></td>
      <td>Concurrent*</td>
      <td><code>true</code></td>
      <td><code>true</code> ⭐</td>
      <td>N/A</td>
      <td><code>true</code> ⭐</td>
    </tr>
  </tbody>
</table>

```csharp
public static class WhenAllThrottledExtensions
{
    public static async Task WhenAllThrottled(this IEnumerable<Task> source, int throttled)
    {
        var tasks = new List<Task>();
        throttled--;
        foreach (var task in source)
        {
            if (tasks.Count == throttled)
            {
                var finishedTask = await Task.WhenAny(tasks);
                _ = tasks.Remove(finishedTask);
            }
            tasks.Add(task);
        }
        await Task.WhenAll(tasks);
    }
}
```

For more details, please see corresponding Unit Tests: [Appendix - RunWhenAllThrottled](#appendix---runwhenallthrottled).

💡 This is a simplified version without result processing. Try to convert this snippet to `ThrottledForEachAsync` version.

Run the code:

```csharp
private static IEnumerable<int> GenerateData()
{
    yield return 2;
    yield return 2;
    yield return 1;
    yield return 1;
}

[Benchmark]
public async Task ThrottledInterleaved() =>
    await GenerateData().Select(i => Task.Delay(i * 100)).WhenAllThrottled(2);

// |               Method |     Mean |   Error |  StdDev |
// |--------------------- |---------:|--------:|--------:|
// | ThrottledInterleaved | 300.6 ms | 0.06 ms | 0.05 ms |
```

### Throttled ControlDegreeOfParallelism ForEachAsync

You don't always need interleaving. Let's see the approach based on `System.Collections.Concurrent.Partitioner`.

It limits the number of operations that are able to run in parallel. One way to achieve that is to partition the input data set into *N* partitions, where *N* is the desired maximum degree of parallelism, and schedule a separate task to begin the execution for each partition. [ref](https://devblogs.microsoft.com/pfxteam/implementing-a-simple-foreachasync-part-2/).

<table class="table table-sm table-responsive table-striped table-hover">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Order of processing</th>
      <th scope="col">Process as Complete</th>
      <th scope="col">Throttled</th>
      <th scope="col">Batch Cancellation</th>
      <th scope="col">Interleaving</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>ControlParallelismForEachAsync</code></td>
      <td>Concurrent*</td>
      <td><code>true</code></td>
      <td><code>true</code> ⭐</td>
      <td>N/A</td>
      <td><code>false</code> ⭐</td>
    </tr>
  </tbody>
</table>

```csharp
public static class ControlParallelismForEachAsyncExtensions
{
    public static Task ForEachAsync<T>(this IEnumerable<T> source, int dop, Func<T, Task> body)
    {
        return Task.WhenAll(
            from partition in Partitioner.Create(source).GetPartitions(dop)
            select Task.Run(async delegate {
                using (partition)
                    while (partition.MoveNext())
                        await body(partition.Current);
        }));
    }
}
```

Run the code:

```csharp
private static IEnumerable<int> GenerateData()
{
    yield return 2;
    yield return 1;
    yield return 2;
    yield return 1;
}

[Benchmark]
public async Task ControlParallelismForEachAsync() =>
    await GenerateData().ForEachAsync(dop: 2, i => Task.Delay(i * 100));

// |                         Method |     Mean |   Error |  StdDev |
// |------------------------------- |---------:|--------:|--------:|
// | ControlParallelismForEachAsync | 300.5 ms | 0.86 ms | 0.76 ms |
```

## Summary

Here is the final comparison table:

<table class="table table-sm table-responsive table-striped table-hover">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Order of processing</th>
      <th scope="col">Process as Complete</th>
      <th scope="col">Throttled</th>
      <th scope="col">Batch Cancellation</th>
      <th scope="col">Interleaving</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>Task.WhenAll</code></td>
      <td>Concurrent ⭐</td>
      <td><code>false</code></td>
      <td><code>false</code></td>
      <td><code>true</code></td>
      <td>N/A</td>
    </tr>
    <tr>
      <td><code>SequentialBlockingForEachAsync</code></td>
      <td>Sequential</td>
      <td><code>false</code></td>
      <td><code>true</code>*</td>
      <td>on demand</td>
      <td><code>true</code> ⭐</td>
    </tr>
    <tr>
      <td><code>ConcurrentInterleavedForEachAsync</code></td>
      <td>Concurrent ⭐</td>
      <td><code>true</code></td>
      <td><code>false</code></td>
      <td>on demand</td>
      <td><code>true</code> ⭐</td>
    </tr>
    <tr>
      <td><code>ConcurrentInterleavedCombinator</code></td>
      <td>Concurrent ⭐</td>
      <td><code>true</code></td>
      <td><code>false</code></td>
      <td>on demand</td>
      <td><code>true</code> ⭐</td>
    </tr>
    <tr>
      <td><code>WhenAllThrottled</code></td>
      <td>Concurrent*</td>
      <td><code>true</code></td>
      <td><code>true</code> ⭐</td>
      <td>N/A</td>
      <td><code>true</code> ⭐</td>
    </tr>
    <tr>
      <td><code>ControlParallelismForEachAsync</code></td>
      <td>Concurrent*</td>
      <td><code>true</code></td>
      <td><code>true</code> ⭐</td>
      <td>N/A</td>
      <td><code>false</code> ⭐</td>
    </tr>
  </tbody>
</table>

For now, you have enough knowledge to build more complex combinators to meet your requirements. I suggest you to check [Reference](https://www.theurlist.com/tap-composition) for more information.

Hope you find this blog useful. Let me know what you think!

---

## Appendix

### Appendix - Example Tasks

```csharp
public static async Task<int> RunJob(int milliseconds, int taskId, CancellationToken cancellationToken = default)
{
    await Task.Delay(milliseconds, cancellationToken);
    return taskId;
}

public static async Task ThrowJob(int milliseconds = 100)
{
    await Task.Delay(milliseconds);
    throw new InvalidOperationException(nameof(ThrowJob));
}

public static async Task CanceledJob(int milliseconds)
{
    var cancellationTokenSource = new CancellationTokenSource(milliseconds);
    await Task.Delay(milliseconds * 2, cancellationTokenSource.Token);
}
```

### Appendix - Task.WhenAll

```csharp
[Fact]
public async Task WhenAll_Result_Unwrapped()
{
    var job1 = RunJob(100, 1);
    var job2 = RunJob(300, 2);
    Task<int[]> whenAllTask = Task.WhenAll(job1, job2);
    var results = await whenAllTask;

    Assert.Equal(new int[] { 1, 2 }, results);
    Assert.True(whenAllTask.IsCompletedSuccessfully);
    Assert.Equal(TaskStatus.RanToCompletion, whenAllTask.Status);
}

[Fact]
public void WhenAll_ExceptionsThrown_ExceptionsAggregated()
{
    var job1 = RunJob(100, 1);
    var job2 = ThrowJob(100);
    var job3 = ThrowJob(100);
    var job4 = RunJob(150, 4);
    AggregateException captured = default;
    var whenAllTask = Task.WhenAll(job1, job2, job3, job4);
    try
    { whenAllTask.Wait(); }
    catch (AggregateException ae) { captured = ae; };

    var whenAllException = whenAllTask.Exception;
    Assert.True(whenAllTask.IsFaulted);
    Assert.Equal(2, captured.Flatten().InnerExceptions.Count);
    // this is interesting
    Assert.NotSame(whenAllException, captured);
    Assert.Equal(whenAllException.Message, captured.Message);
}

[Fact]
public async Task WhenAll_ExceptionsThrown_ExceptionUnwrapped()
{
    var job1 = RunJob(100, 1);
    var job2 = ThrowJob(100);
    var job3 = ThrowJob(100);
    List<Task> batch = new() { job1, job2, job3 };
    InvalidOperationException captured = default;

    // t_all = whenall(t1, t2->throws, t3->throws)
    // t_all.Exception = AggregateException(t2.Exception, t3.Exception)
    // await t_all -> unwrap t_all.AggregateException -> select (t2 | t3) as t_selected
    // -> unwrap t_selected

    var whenAllTask = Task.WhenAll(batch);
    try
    { await whenAllTask; }
    catch (InvalidOperationException e) { captured = e; };

    Assert.True(whenAllTask.IsFaulted);
    Assert.Equal(TaskStatus.Faulted, whenAllTask.Status);
    Assert.Equal(TaskStatus.RanToCompletion, job1.Status);

    Assert.Equal(2, whenAllTask.Exception.Flatten().InnerExceptions.Count);
    var aggregatedException = Assert.IsType<AggregateException>(job2.Exception);
    Assert.Contains(captured, batch.Select(t => t.Exception?.InnerException));
}

[Fact]
public async Task WhenAll_ExceptionsThrown_UnwrappedChildTask()
{
    var job1 = RunJob(100, 1);
    var job2 = ThrowJob(100);
    List<Task> batch = new() { job1, job2 };
    InvalidOperationException captured1 = default;
    InvalidOperationException captured2 = default;

    var whenAllTask = Task.WhenAll(batch);
    try
    { await whenAllTask; }
    catch (InvalidOperationException e) { captured1 = e; };

    Assert.Equal(TaskStatus.Faulted, job2.Status);
    try
    { await job2; }
    catch (InvalidOperationException e) { captured2 = e; };

    Assert.Same(captured1, captured2);
    Assert.Equal(captured1.Message, captured2.Message);
}

[Fact]
public async Task WhenAll_CanceledTask_ExceptionThrown()
{
    var job1 = RunJob(100, 1);
    var job2 = CanceledJob(50);
    var job3 = CanceledJob(100);

    TaskCanceledException captured = null;

    var whenAllTask = Task.WhenAll(job1, job2, job3);
    try
    { await whenAllTask; }
    catch (TaskCanceledException e) { captured = e; };

    Assert.True(whenAllTask.IsCompleted && whenAllTask.IsCanceled);
    Assert.Equal(TaskStatus.Canceled, whenAllTask.Status);
    Assert.NotNull(captured);
    Assert.Null(whenAllTask.Exception);
    Assert.Null(job2.Exception);
    Assert.Null(job3.Exception);
    Assert.Equal(TaskStatus.Canceled, job2.Status);
    Assert.Equal(TaskStatus.Canceled, job3.Status);
}

[Fact]
public async Task WhenAll_CanceledAndFaulted_ExceptionOverCancellation()
{
    var job1 = RunJob(100, 1);
    var job2 = CanceledJob(50);
    var job3 = ThrowJob(100);

    var whenAllTask = Task.WhenAll(job1, job2, job3);
    try
    { await whenAllTask; }
    catch { };

    Assert.True(whenAllTask.IsFaulted);
    Assert.Equal(TaskStatus.Faulted, whenAllTask.Status);
    Assert.Equal(TaskStatus.RanToCompletion, job1.Status);
    Assert.Equal(TaskStatus.Canceled, job2.Status);
    Assert.Equal(TaskStatus.Faulted, job3.Status);
    Assert.IsType<InvalidOperationException>(whenAllTask.Exception.InnerException);
    Assert.Null(job2.Exception);
}

[Fact]
public async Task WhenAll_SharedCancellationToken_AllCancelled()
{
    var cancellationTokenSource = new CancellationTokenSource(50);
    var t = cancellationTokenSource.Token;
    var job1 = RunJob(100, 1, t);
    var job2 = RunJob(150, 2, t);
    var job3 = RunJob(200, 3, t);
    List<Task> batch = new() { job1, job2, job3 };

    var whenAllTask = Task.WhenAll(batch);
    try
    { await whenAllTask; }
    catch { };

    Assert.All(batch, t => Assert.True(t.IsCanceled));
}
```

### Appendix - Task.WhenAny

```csharp
[Fact]
public async Task WhenAny_FirstCanceled()
{
    var job1 = RunJob(100, 1);
    var job2 = CanceledJob(50);
    var job3 = ThrowJob(70);
    List<Task> batch = new() { job1, job2, job3 };

    var waitForAnyTaskTask = Task.WhenAny(batch);
    var someTask = await waitForAnyTaskTask;

    Assert.Equal(TaskStatus.RanToCompletion, waitForAnyTaskTask.Status);
    Assert.Equal(TaskStatus.Canceled, someTask.Status);

    var someTask2 = await Task.WhenAny(batch);
    Assert.Same(someTask, someTask2);

    await Task.Delay(100); // let other tasks to complete
    var someTask3 = await Task.WhenAny(batch);

    Assert.NotSame(someTask, someTask3);
}
```

### Appendix - RunWhenAllThrottled

```csharp
[Fact]
public async Task WhenAllThrottled_AllGood()
{
    var batch = Generate();
    var whenAllTask = batch.WhenAllThrottled(2);

    Assert.Equal(TaskStatus.WaitingForActivation, whenAllTask.Status);

    await whenAllTask;

    Assert.Equal(TaskStatus.RanToCompletion, whenAllTask.Status);

    static IEnumerable<Task> Generate()
    {
        yield return RunJob(100, 1);
        yield return RunJob(100, 2);
        yield return RunJob(100, 3);
        yield return RunJob(100, 4);
    }
}

[Fact]
public async Task WhenAllThrottled_ExceptionPropagated()
{
    var batch = Generate();
    var whenAllTask = batch.WhenAllThrottled(2);

    try
    { await whenAllTask; }
    catch { };

    Assert.Equal(TaskStatus.Faulted, whenAllTask.Status);

    static IEnumerable<Task> Generate()
    {
        yield return RunJob(100, 1);
        yield return ThrowJob(100);
        yield return RunJob(100, 3);
        yield return ThrowJob(100);
        yield return RunJob(100, 5);
    }
}

[Fact]
public async Task WhenAllThrottled_CancellationPropagated()
{
    var batch = Generate();
    var whenAllTask = batch.WhenAllThrottled(2);

    try
    { await whenAllTask; }
    catch { };

    Assert.Equal(TaskStatus.Canceled, whenAllTask.Status);

    static IEnumerable<Task> Generate()
    {
        yield return RunJob(100, 1);
        yield return CanceledJob(100);
        yield return RunJob(100, 3);
        yield return CanceledJob(100);
    }
}
```

---
