---
layout: post
title: "Automated Tests instrumentation via OpenTelemetry and Aspire Dashboard"
categories: [ dotnet, opentelemetry ]
tags: [ dotnet, aspnetcore, opentelemetry, aspire ]
published: true
shortinfo: "Learn how you can use OpenTelemetry to monitor your automated tests and send that data to the Aspire Dashboard for visualization."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

In this post, we'll look at how you can use [OpenTelemetry](https://opentelemetry.io/docs/languages/net/instrumentation/) to monitor your automated tests and send that data to the Aspire Dashboard for visualization. The benefit of this approach is that you gain better insights into how your code works.

**Source code**: <https://github.com/NikiforovAll/tests-instrumentation-with-otel-and-aspire>

<center>
    <img src="/assets/test-instrumentation/blog-cover.png" style="margin: 15px;">
</center>

- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Running Integration Tests](#running-integration-tests)
- [Code Explained](#code-explained)
  - [Instrumenting Tests](#instrumenting-tests)
- [Conclusion](#conclusion)
- [References](#references)

## Introduction

In this post, we'll look at how you can use [OpenTelemetry](https://opentelemetry.io/docs/languages/net/instrumentation/) to monitor your automated tests and send that data to the Aspire Dashboard for visualization. The benefit of this approach is that you gain better insights into how your code works.

We are going to write integration tests for TodoApi application that can be defined as following:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddHostedService<DbInitializer>();
builder.AddNpgsqlDbContext<TodoDbContext>("db");
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.MapDefaultEndpoints();

app.MapTodos();

await app.RunAsync();
```

Here is the API surface:

```csharp
public static RouteGroupBuilder MapTodos(this IEndpointRouteBuilder routes)
{
    var group = routes.MapGroup("/todos");

    group.WithTags("Todos");

    group.WithParameterValidation(typeof(TodoItemViewModel));

    group
        .MapGet("/", GetTodoItems)
        .WithOpenApi();

    group
        .MapGet("/{id}", GetTodoItem)
        .WithOpenApi();

    group
        .MapPost("/", CreateTodoItem)
        .WithOpenApi();

    group
        .MapPut("/{id}", UpdateTodoItem)
        .WithOpenApi();

    group
        .MapDelete("/{id}", DeleteTodoItem)
        .WithOpenApi();

    return group;
}
```

It's a very basic CRUD application, please feel free to investigate the details in the source code.

## Running Integration Tests

The tests are written based on the following technologies:

- `XUnit` - test framework
- `Testcontainers` - test dependencies management via Docker Engine and [.NET integration](https://dotnet.testcontainers.org/).
- `Alba` - author integration tests against ASP.NET Core HTTP endpoints. Alba scenarios actually exercise the full ASP.NET Core application by running HTTP requests through your ASP.NET system in memory using the built in [ASP.NET Core TestServer](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests).

I will explain how to instrument integration tests later. Right now, let's see how it works.

```bash
dotnet test --filter TodosTests --verbosity normal
# Starting test execution, please wait...
# A total of 1 test files matched the specified pattern.
# [xUnit.net 00:00:00.00] xUnit.net VSTest Adapter v2.8.1+ce9211e970 (64-bit .NET 8.0.6)
# [xUnit.net 00:00:00.17]   Discovering: Api.IntegrationTests
# [xUnit.net 00:00:00.24]   Discovered:  Api.IntegrationTests
# [xUnit.net 00:00:00.24]   Starting:    Api.IntegrationTests
# [xUnit.net 00:00:07.51]   Finished:    Api.IntegrationTests
# Test Run Successful.
# Total tests: 6
#      Passed: 6
#  Total time: 8.3519 Seconds
```

Here are output traces that can be found in Aspire Dashboard:

<center>
    <img src="/assets/test-instrumentation/overview.png" style="margin: 15px;">
</center>

Open: <http://localhost:18888/> to see the results of Test Runs.

The interesting part here is a "Warmup" and "TestRun" traces. "Warmup" traces shows us how much time it took to setup host `TestServer` for *TodoApi*, *PostgreSQL* container, and *Aspire Dashboard* as reusable container.

<center>
    <img src="/assets/test-instrumentation/warmup.png" style="margin: 15px;">
</center>

As you can see, we have a lot of thing going on during automatic database migration.

Let's open "TestRun" traces. I've prepared two ways you can run integration tests. By default, `XUnit` runs tests within the same `TestCollection` sequentially, but we can override this behavior by using a custom test framework.

Here is sequential version:

<center>
    <img src="/assets/test-instrumentation/seq-test-run.png" style="margin: 15px;">
</center>

And here is parallel version:

<center>
    <img src="/assets/test-instrumentation/par-test-run.png" style="margin: 15px;">
</center>

💡Every test run is separated based on  `service.instance.id` with value assigned to `test.run_id` custom attribute. It is assigned to every trace to make test runs discoverable. `test.run_id` is generated as sequential guid to order the test runs in time. Basically, you can use Aspire Dashboard drop down for replica set to inspect every test run.

<center>
    <img src="/assets/test-instrumentation/replica-set.png" style="margin: 15px;">
</center>

## Code Explained

As mentioned previously, I use `Alba` to setup `TestServer` host.

In the code below, we are setting up reusable `WebAppFixture`. It will contain everything we need to test and interact with `TestSever`.

The other thing here we need to mention about is that we start `Activity` named "TestRun" to group sub-Activities for a test run.

```csharp
public class WebAppFixture : IAsyncLifetime
{
    public static ActivitySource ActivitySource { get; } = new(TracerName);
    private const string TracerName = "tests";
    public IAlbaHost AlbaHost { get; private set; } = default!;
    public static Activity ActivityForTestRun { get; private set; } = default!;

    private readonly IContainer aspireDashboard = new ContainerBuilder()
        .WithImage("mcr.microsoft.com/dotnet/aspire-dashboard:8.0.0")
        .WithPortBinding(18888, 18888)
        .WithPortBinding(18889, true)
        .WithEnvironment("DOTNET_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS", "true")
        .WithWaitStrategy(
            Wait.ForUnixContainer().UntilHttpRequestIsSucceeded(r => r.ForPort(18888))
        )
        .WithReuse(true)
        .WithLabel("aspire-dashboard", "aspire-dashboard-reuse-id")
        .Build();

    private readonly PostgreSqlContainer db = new PostgreSqlBuilder()
        .WithImage("postgres:16")
        .Build();

    public async Task InitializeAsync()
    {
        await this.BootstrapAsync();

        ActivityForTestRun = ActivitySource.StartActivity("TestRun")!;
    }

    private async Task BootstrapAsync()
    {
        using var warmupTracerProvider = Sdk.CreateTracerProviderBuilder()
            .AddSource(TracerName)
            .Build();

        using var activityForWarmup = ActivitySource.StartActivity("Warmup")!;

        await this.aspireDashboard.StartAsync();
        activityForWarmup?.AddEvent(new ActivityEvent("AspireDashboard Started."));
        await this.db.StartAsync();
        activityForWarmup?.AddEvent(new ActivityEvent("PostgresSql Started."));

        var otelExporterEndpoint =
            $"http://localhost:{this.aspireDashboard.GetMappedPublicPort(18889)}";

        using var hostActivity = ActivitySource.StartActivity("Start Host")!;

        this.AlbaHost = await Alba.AlbaHost.For<Program>(builder =>
        {
            builder.UseEnvironment("Test");

            builder.UseSetting("OTEL_EXPORTER_OTLP_ENDPOINT", otelExporterEndpoint);
            builder.UseSetting("OTEL_TRACES_SAMPLER", "always_on");
            builder.UseSetting("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc");
            builder.UseSetting("OTEL_DOTNET_EXPERIMENTAL_OTLP_RETRY", "in_memory");
            builder.UseSetting("OTEL_SERVICE_NAME", "test-host");

            builder.UseSetting(
                "Aspire:Npgsql:EntityFrameworkCore:PostgreSQL:ConnectionString",
                this.db.GetConnectionString()
            );

            // ordered guid to sort test runs
            var testRunId = NewId.Next().ToString();

            builder.ConfigureServices(services =>
            {
                services
                    .AddOpenTelemetry()
                    .WithTracing(tracing =>
                        tracing
                            .SetResourceBuilder(
                                ResourceBuilder
                                    .CreateDefault()
                                    .AddService(TracerName, serviceInstanceId: testRunId)
                            )
                            .AddSource(TracerName)
                            .AddProcessor(new TestRunSpanProcessor(testRunId))
                    );

                services.AddDbContextFactory<TodoDbContext>();
            });
        });

        await this.AlbaHost.StartAsync();
        activityForWarmup?.AddEvent(new ActivityEvent("Host Started."));

        // wait for migration
        await this
            .AlbaHost.Services.GetServices<IHostedService>()
            .FirstOrDefault(h => h.GetType() == typeof(DbInitializer))
            .As<DbInitializer>()
            .StartupTask;
    }

    public async Task DisposeAsync()
    {
        ActivityForTestRun?.Stop();

        await this.AlbaHost.DisposeAsync();
        await this.db.StopAsync();
    }
}
```

We can define a collection of tests that will reuse same instance of `WebAppFixture` via `Xunit.CollectionAttribute` like this:

```csharp
[CollectionDefinition(nameof(WebAppCollection))]
public sealed class WebAppCollection : ICollectionFixture<WebAppFixture>;

[Collection(nameof(WebAppCollection))]
public abstract class WebAppContext(WebAppFixture fixture)
{
    public IAlbaHost Host { get; } = fixture.AlbaHost;
}
```

Now, we can use it by inheriting from `WebAppContext`:

```csharp
[TracePerTestRun]
public class TodosTests(WebAppFixture fixture) : WebAppContext(fixture)
{
    private static readonly Func<
        FluentAssertions.Equivalency.EquivalencyAssertionOptions<TodoItem>,
        FluentAssertions.Equivalency.EquivalencyAssertionOptions<TodoItem>
    > ExcludingTodoItemFields = cfg => cfg.Excluding(p => p.Id);

    [Theory, AutoData]
    public async Task GetTodos_SomeTodosExist_Ok(string todoItemTitle)
    {
        TodoItem item = new() { Title = todoItemTitle };
        await this.AddTodo(item);

        var result = await this.Host.GetAsJson<TodoItemViewModel[]>("/todos");

        result.Should().NotBeNull();
        result.Should().ContainEquivalentOf(item, ExcludingTodoItemFields);
    }

    [Fact]
    public async Task PostTodos_ValidTodo_Ok()
    {
        var item = new TodoItem { Title = "I want to do this thing tomorrow" };

        var result = await this.AddTodo(item);

        result.Should().NotBeNull();
        result!.IsComplete.Should().BeFalse();
    }

    [Theory, AutoData]
    public async Task GetTodo_ExistingTodo_Ok(TodoItem item)
    {
        var dbTodo = await this.AddTodo(item);

        var result = await this.Host.GetAsJson<TodoItemViewModel>($"/todos/{dbTodo.Id}");

        result.Should().NotBeNull();

        result.Should().BeEquivalentTo(item, ExcludingTodoItemFields);
    }

    [Theory, AutoData]
    public async Task DeleteTodo_ExistingTodo_Ok(TodoItem item)
    {
        var dbTodo = await this.AddTodo(item);

        await this.Host.Scenario(_ =>
        {
            _.Delete.Url($"/todos/{dbTodo.Id}");
            _.StatusCodeShouldBeOk();
        });
    }
}
```

### Instrumenting Tests

You might mention special attributed called `TracePerTestRun`. It is responsible for OpenTelemetry test instrumentation.

`XUnit` provides `BeforeAfterTestAttribute` to hookup to test execution lifecycle. We use it to start sub-Activities under parent "TestRun" activity. 

```csharp
public abstract class BaseTraceTestAttribute : BeforeAfterTestAttribute { }

[AttributeUsage(
    AttributeTargets.Class | AttributeTargets.Method,
    AllowMultiple = false,
    Inherited = true
)]
public sealed class TracePerTestRunAttribute : BaseTraceTestAttribute
{
    private Activity? activityForThisTest;

    public override void Before(MethodInfo methodUnderTest)
    {
        ArgumentNullException.ThrowIfNull(methodUnderTest);

        this.activityForThisTest = WebAppFixture.ActivitySource.StartActivity(
            methodUnderTest.Name,
            ActivityKind.Internal,
            WebAppFixture.ActivityForTestRun.Context
        );

        base.Before(methodUnderTest);
    }

    public override void After(MethodInfo methodUnderTest)
    {
        this.activityForThisTest?.Stop();
        base.After(methodUnderTest);
    }
}
```

Also, for our convenience and to group tests together, we want to add `TestRunSpanProcessor`. It enriches every span with `test.run_id` tag/attribute. It is an extension point provided by .NET OpenTelemetry instrumentation library.

```csharp
public class TestRunSpanProcessor(string testRunId) : BaseProcessor<Activity>
{
    private readonly string testRunId = testRunId;

    public override void OnStart(Activity data) => data?.SetTag("test.run_id", this.testRunId);
}
```

🙌 Hooray, now you know how to instrument automated tests with *OpenTelemetry* and visualize the test runs via *Aspire Dashboard*

💡See <https://www.honeycomb.io/blog/monitoring-unit-tests-opentelemetry> for more details on how to instrument unit tests with *OpenTelemetry*. This blog post originally inspired me to write this blog post.

## Conclusion

In this post, we've explored how to use OpenTelemetry to instrument our automated tests and visualize the data on the Aspire Dashboard. This approach provides valuable insights into how our code operates, helping us to identify potential bottlenecks and improve the overall performance and reliability of our applications.

We've seen how to set up integration tests for a basic CRUD application using `XUnit`, `Testcontainers`, and `Alba`. We've also learned how to run these tests both sequentially and in parallel, and how to view the results in the Aspire Dashboard.

By instrumenting our tests with OpenTelemetry, we can gain a deeper understanding of our code and its behavior under test conditions. This can lead to more robust, reliable, and efficient applications.

Remember, the source code for this post is available on GitHub at <https://github.com/NikiforovAll/tests-instrumentation-with-otel-and-aspire>. Feel free to explore it further and use it as a starting point for your own test instrumentation.

Happy testing! 🚀

## References

- <https://opentelemetry.io/docs/languages/net/instrumentation/>
- <https://dotnet.testcontainers.org/>
- <https://jasperfx.github.io/alba/guide/gettingstarted.html>
- <https://www.honeycomb.io/blog/monitoring-unit-tests-opentelemetry>
- <https://github.com/testcontainers/testcontainers-dotnet>