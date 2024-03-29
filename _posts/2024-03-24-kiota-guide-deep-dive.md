---
layout: post
title: "A Guide to OpenAPI Client Generation with Kiota. Deep dive (Part 2)"
categories: [ dotnet, aspnetcore ]
tags: [ dotnet, aspnetcore, openapi, aspire, cli ]
published: true
shortinfo: This post provides a deep dive into OpenAPI client generation with Kiota, covering topics such as SDK generation, dependency injection, typed HTTP clients, cross-cutting concerns, and testing.
fullview: false
comments: true
related: true
mermaid: true
---

> Source code: <https://github.com/NikiforovAll/kiota-getting-started>

---
*Table of Contents*:

- [Introduction](#introduction)
- [Setup](#setup)
- [Generate HTTP Client for ASP.NET Core applications](#generate-http-client-for-aspnet-core-applications)
  - [Generate OpenAPI specification automatically](#generate-openapi-specification-automatically)
  - [Use OpenAPI Specification](#use-openapi-specification)
  - [Demo](#demo)
- [Dependency Injection, Typed HTTP Clients, and `IHttpClientFactory`](#dependency-injection-typed-http-clients-and-ihttpclientfactory)
- [Cross-Cutting Concerns and Resilience](#cross-cutting-concerns-and-resilience)
- [Testing](#testing)
- [Conclusion](#conclusion)
- [References](#references)

## Introduction

In the [previous blog post](https://nikiforovall.github.io/dotnet/aspnetcore/2024/03/22/kiota-guide-introduction.html), we learned the basics of **Kiota**. In this post, I want to share more details on how to apply it in production scenarios in a more sophisticated manner.

I will show you the following aspects of successful SDK development:

* Generation of SDKs for ASP.NET Core applications
* Dependency Injection, Typed HTTP Clients, and `IHttpClientFactory`
* Cross-Cutting Concerns
* Testing

## Setup

We want to create an `App.Client` API project that calls the `App` trending API, which we've built in a previous post. We will use .NET Aspire to glue everything together.

Aspire is a powerful library for .NET applications that simplifies the process of service discovery, configuration, and registration. It provides a set of tools and abstractions that allow developers to easily connect their services and clients in a decoupled manner.

In the context of our `App.Client` API project, we can use Aspire to automatically discover and register the `App` trending API. This means that our client application doesn't need to know the exact location or configuration of the `App` API - Aspire will handle this for us.

<div class="mermaid">
graph LR
    App --> NewsSearchSdk["NewsSearch.Sdk"]
    App --> AppServiceDefaults["App.ServiceDefaults"]
    AppClient --> AppSdk["App.Sdk"]
    AppClient["App.Client"] --> AppServiceDefaults
    AppAppHost["App.AppHost"] --> App
    AppAppHost --> AppClient
</div>

Here is `App/Program.cs`

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();

var services = builder.Services;
services.AddEndpointsApiExplorer();
services.AddSwaggerGen();

var app = builder.Build();
app.MapDefaultEndpoints();
app.MapTrendingEndpoints();

app.Run();
```

And here is `App.Client/Program.cs`

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();

var services = builder.Services;
services.AddEndpointsApiExplorer();
services.AddSwaggerGen();

var app = builder.Build();
app.MapDefaultEndpoints();
app.MapGet("/my/trending", () =>
{
  // TODO:
});

app.Run();
```

## Generate HTTP Client for ASP.NET Core applications

ASP.NET Core has built-in support for OpenAPI, also known as Swagger. This support allows developers to generate API documentation directly from their code. The quality of the generated OpenAPI specification largely depends on the amount of metadata provided by the developer in the form of attributes and comments. The more detailed and accurate this metadata is, the more precise and useful the generated OpenAPI specification will be. This, in turn, improves the quality of the client SDKs generated from the OpenAPI specification.

### Generate OpenAPI specification automatically

We can generate OpenAPI specification at build time from the code in ASP.NET Core by using `Microsoft.Extensions.ApiDescription.Server`

```bash
dotnet add ./src/App package Microsoft.Extensions.ApiDescription.Server
```

And add configuration to `App.csproj`:

```xml
<PropertyGroup>
  <OpenApiDocumentsDirectory>$(MSBuildProjectDirectory)/../App.Sdk/OpenApi</OpenApiDocumentsDirectory>
  <OpenApiGenerateDocuments>true</OpenApiGenerateDocuments>
  <OpenApiGenerateDocumentsOnBuild>true</OpenApiGenerateDocumentsOnBuild>
</PropertyGroup>
```

Note, I decided to set up the output location outside of the project - `src/App.Sdk/OpenApi`. We can combine the OpenAPI generation with **Kiota** `App.Sdk` client generation:

Add the next Target to `App.csproj`. Every time we change `App`, the `App.Sdk` is regenerated. This makes the process fully automatic. Personally, I like this developer experience because I can always see the changed files in the source code.

```xml
<Target Name="OpenAPI" AfterTargets="Build" Condition="$(Configuration)=='Debug'">
      <Exec Command="dotnet kiota generate -l CSharp --output ../App.Sdk --namespace-name App.Sdk --class-name AppApiClient --exclude-backward-compatible --openapi ../App.Sdk/OpenApi/App.json" WorkingDirectory="$(ProjectDir)" />
</Target>
```

### Use OpenAPI Specification

The `AppApiClient` class is a central part of the generated SDK. It provides methods for making HTTP requests to the API endpoints defined in our application. In the example below, we are using the `AppApiClient` to make a GET request to the `/trending/{country}` endpoint.

The `AppApiClient` takes an `IRequestAdapter` as a parameter in its constructor. This adapter is responsible for sending HTTP requests and receiving HTTP responses. In this example, we are using the `HttpClientRequestAdapter`.

We also provide an `IAuthenticationProvider` to the `HttpClientRequestAdapter`. This provider is responsible for providing the necessary authentication credentials for the API requests. In this example, we are using the `AnonymousAuthenticationProvider`, which does not provide any authentication credentials.

Finally, we set the `BaseUrl` of the `HttpClientRequestAdapter`. This URL is used as the base for all API requests made by the `AppApiClient`.

```csharp
// App.Client/Program.cs
app.MapGet("/my/trending", async () =>
{
    var authProvider = new AnonymousAuthenticationProvider();
    var requestAdapter = new HttpClientRequestAdapter(authProvider, httpClient: httpClient)
    {
        BaseUrl = "http://app"
    };
    var client = new AppApiClient(requestAdapter);

    var response = await client.Trending["US"].GetAsync();

    return response.Value.Select(topic => topic.Query.Text);
});
```

💡Note, the `BaseUrl` is based on Aspire convention. Here is `App.AppHost`:

```csharp
// App.AppHost/Program.cs
var builder = DistributedApplication.CreateBuilder(args);

var appProject = builder.AddProject<Projects.App>("app");

builder.AddProject<Projects.App_Client>("app-client")
    .WithReference(appProject);

builder.Build().Run();
```

### Demo

```bash
dotnet run --project ./src/App.AppHost
curl -s http://localhost:5102/my/trending | jq
```

<div class="mermaid">
graph LR
    User(fa:fa-user) --> AppClient["App.Client"]
    AppClient --> AppSdk["App.Sdk"]
    AppSdk --> App
    App --> NewsSearchSdk["NewsSearch.Sdk"]
    NewsSearchSdk --> BingApi["Bing Search API"]

    style AppSdk fill:#add8e6
    style NewsSearchSdk fill:#add8e6
    style BingApi fill:#ffff99
</div>

![demo2](/assets/kiota/demo2.png)

And here is trace example from **Aspire.Dashboard**:

![trace-example](/assets/kiota/trace-example.png)

💡Note, Http instrumentation/tracing works only for clients resolved through DI container. Later, I will show you how to properly add `AppApiClient` so it uses `HttpClient` from `IHttpClientFactory`.

## Dependency Injection, Typed HTTP Clients, and `IHttpClientFactory`

As you may already know, `IHttpClientFactory` in .NET provides a better way to work with `HttpClient`, as it addresses well-known client lifetime issues. In this guide, I will demonstrate how to use a client generated by **Kiota** as a typed client. For more information, refer to the [Typed-client approach](https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory#typed-clients).

```csharp
// App.Client/Program.cs
services.AddSingleton<IAuthenticationProvider, AnonymousAuthenticationProvider>(
    _ => new AnonymousAuthenticationProvider());

services.AddHttpClient<AppApiClient>()
    .AddTypedClient((httpClient, sp) =>
    {
        var authenticationProvider = sp.GetRequiredService<IAuthenticationProvider>();
        var requestAdapter = new HttpClientRequestAdapter(authProvider , httpClient: httpClient)
        {
            BaseUrl = "http://app"
        };

        return new AppApiClient(requestAdapter);
    })
    .ConfigurePrimaryHttpMessageHandler(_ =>
    {
        var defaultHandlers = KiotaClientFactory.CreateDefaultHandlers();
        var defaultHttpMessageHandler = KiotaClientFactory.GetDefaultHttpMessageHandler();

        return KiotaClientFactory.ChainHandlersCollectionAndGetFirstLink(
            defaultHttpMessageHandler, [.. defaultHandlers])!;
    });
```

The code above is configuring an `HttpClient` for the `AppApiClient` in a .NET application. The `AddTypedClient` method is used to further configure the `HttpClient` instance. The advantage of using typed clients is that they provide a clear contract for HTTP interactions and can be easily mocked for testing.

By default, **Kiota** provides the default list of `DelegatingHandler`s and `HttpMessageHandler`. It is good idea to include them, but you can definitely opt-out if it interferes with your code.

```csharp
public static IList<DelegatingHandler> CreateDefaultHandlers()
{
    return new List<DelegatingHandler>
    {
        new RetryHandler(),
        new RedirectHandler(),
        new ParametersNameDecodingHandler(),
        new UserAgentHandler(),
        new HeadersInspectionHandler()
    };
}
```

The `ConfigurePrimaryHttpMessageHandler` method is used to set up the primary `HttpMessageHandler` for the HTTP client. This handler is responsible for sending HTTP requests and receiving HTTP responses.

```csharp
public static IHttpClientBuilder ConfigurePrimaryHttpMessageHandler(
    this IHttpClientBuilder builder,
    Func<IServiceProvider, HttpMessageHandler> configureHandler);
```

Here's how it works:

1. Create a list of default `DelegatingHandler` instances using `KiotaClientFactory.CreateDefaultHandlers()`. A `DelegatingHandler` is a special type of `HttpMessageHandler` that can be used to process or manipulate HTTP requests and responses in some way before they are sent or after they are received.

2. Get the default `HttpMessageHandler` using `KiotaClientFactory.GetDefaultHttpMessageHandler()`. This handler is the one that will actually send the HTTP request and receive the response.

3. Chain these handlers together using `KiotaClientFactory.ChainHandlersCollectionAndGetFirstLink()`. This method takes the default `HttpMessageHandler` and the list of `DelegatingHandler` instances, and chains them together so that each request or response will pass through each handler in turn. The method returns the first link in this chain, which is then used as the primary `HttpMessageHandler` for the HTTP client.

Finally, here is how to use `AppApiClient` from DI:

```csharp
// App.Client/Program.cs
app.MapGet("/my/trending", async (AppApiClient client) =>
{
    var response = await client.Trending["US"].GetAsync();

    return response.Value.Select(topic => topic.Query.Text);
});
```

## Cross-Cutting Concerns and Resilience

In distributed applications, communication between services is a critical aspect. However, this communication is not always reliable. Network issues, high latency, or the unavailability of a service can lead to failures. This is where resilience comes into play.

Polly is a .NET resilience and transient-fault-handling library that allows developers to express policies such as Retry, Circuit Breaker, Timeout, Bulkhead Isolation, and Fallback in a fluent and thread-safe manner. It is a crucial tool for building reliable applications that can withstand the unpredictable nature of the network.

.NET 8, .NET team has made substantial advancements to simplify the integration of resilience into your applications - meet new resilience packages:

```bash
# Extensions to the Polly libraries to enrich telemetry with metadata and exception summaries
dotnet add package Microsoft.Extensions.Resilience
# Resilience mechanisms for HttpClient built on the Polly framework
dotnet add package Microsoft.Extensions.Http.Resilience
```

For an out-of-the-box experience, use the `AddStandardResilienceHandler` extension on the `IHttpClientBuilder` like this:

```csharp
IHttpStandardResiliencePipelineBuilder resilienceBuilder = services
    .AddHttpClient("my-client")
    .AddStandardResilienceHandler(options =>
    {
        // Configure standard resilience options here
    });
```

`IHttpStandardResiliencePipelineBuilder` allows to configure underlying multiple resilience strategies with options to send the requests and handle any transient errors.

In the context of our example, it's worth noting that it already has the `StandardResilienceHandler` built-in. This is due to the fact that **Aspire** has opinionated defaults on how to build distributed applications. This means that it comes with a set of pre-configured settings that are designed to handle common scenarios in a distributed environment.

The `StandardResilienceHandler` is a part of these defaults. It is a resilience strategy that includes a combination of retry, circuit breaker, and timeout policies. These policies are designed to handle transient faults in a graceful manner, ensuring that your application remains responsive and reliable in the face of network issues, high latency, or service unavailability.

The `StandardResilienceHandler` is automatically applied to all HTTP clients that are created through the `IHttpClientFactory`. This means that you don't have to manually configure these resilience policies for each client. Instead, they are applied consistently across your application, ensuring that all HTTP communication is resilient.

Here is partial content from `App.ServiceDefaults/Extensions.cs`:

```csharp
public static IHostApplicationBuilder AddServiceDefaults(this IHostApplicationBuilder builder)
{
    builder.ConfigureOpenTelemetry();

    builder.AddDefaultHealthChecks();

    builder.Services.AddServiceDiscovery();

    builder.Services.ConfigureHttpClientDefaults(http =>
    {
        // Turn on resilience by default
        http.AddStandardResilienceHandler();

        http.UseServiceDiscovery();
    });

    return builder;
}
```

Here is an example of how to use the `AddStandardResilienceHandler` method on top of `IHttpClientBuilder` returned by `AddTypedClient` method for fine-grained control and customization of resiliency per-client:

```csharp
services.AddHttpClient<AppApiClient>().AddTypedClient()
    .AddStandardResilienceHandler().Configure(cfg =>
    {
        cfg.Retry.MaxRetryAttempts = 3;
        cfg.Retry.UseJitter = true;
        cfg.Retry.BackoffType = Polly.DelayBackoffType.Exponential;
    });
```

💡Note, `Microsoft.Extensions.Http.Resilience` allows to build custom pipelines and gives you full control over how to manage resiliency in your applications.

## Testing

For unit testing, it's suggested to use mock versions of the HTTP transport layer to manage API responses. In **Kiota** API clients, this layer is in a request adapter. By mocking the request adapter, you can control the API responses.

```csharp
public class TrendingTopicTests
{
    [Fact]
    public async Task TrendingTopic_GetUS_SuccessAsync()
    {
        // Arrange
        var adapter = Substitute.For<IRequestAdapter>();
        adapter.SetupSendAsyncWithResponse(new TrendingTopics() { Value = [] });

        var newsSearchApiClient = new NewsSearchApiClient(adapter);

        // Act
        var response = await newsSearchApiClient
            .News
            .Trendingtopics
            .GetAsync(r => r.QueryParameters.Cc = "US");

        // Assert
        Assert.NotNull(response);
    }
}

public static class Utils
{
    public static void SetupSendAsyncWithResponse<T>(
        this IRequestAdapter adapter, T response) where T : IParsable
    {
        adapter.SendAsync<T>(
            Arg.Any<RequestInformation>(),
            Arg.Any<ParsableFactory<T>>(),
            Arg.Any<Dictionary<string, ParsableFactory<IParsable>>>(),
            Arg.Any<CancellationToken>())
            .ReturnsForAnyArgs(response);
    }
}
```

💡The process of mocking `IRequestAdapter` can be somewhat complex, particularly as it requires reliance on models generated by **Kiota**. To streamline testing, I recommend encapsulating the use of generated clients within a simple interface and then mocking this interface. This approach not only simplifies testing but also aligns well with the principles of Clean Architecture. By doing so, we avoid the need to mock the Kiota code directly, enhancing the maintainability and readability of our tests.

## Conclusion

In conclusion, **Kiota** is not just a powerful tool, but a practical solution for modern development challenges. It's ready to be integrated into your production code. It's time to embrace **Kiota** and let it transform your development workflow.

## References

* <https://nikiforovall.github.io/dotnet/aspnetcore/2024/03/22/kiota-guide-introduction.html>
* <https://www.meziantou.net/generate-openapi-specification-at-build-time-from-the-code-in-asp-net-core.htm>
* <https://devblogs.microsoft.com/dotnet/introducing-dotnet-aspire-simplifying-cloud-native-development-with-dotnet-8/>
* <https://github.com/microsoft/kiota-http-dotnet/blob/main/src/KiotaClientFactory.cs>
* <https://devblogs.microsoft.com/dotnet/building-resilient-cloud-services-with-dotnet-8/>
* <https://learn.microsoft.com/en-us/openapi/kiota/testing>