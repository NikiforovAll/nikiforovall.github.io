---
layout: post
title: Creating and Using HTTP Client SDKs in .NET 6
categories: [ dotnet, aspnetcore, microservices ]
tags: [ dotnet, microservices, aspnetcore, api, http ]
published: true
shortinfo: There are many ways of developing HTTP Client SDKs. This article helps you to choose the right one according to your scenario.
fullview: false
comments: true
hide-related: true
---

## TL;DR

Learn three ways you can develop HTTP Client SDKs in .NET. Source code: <https://github.com/NikiforovAll/http-sdk-guide>

- [TL;DR](#tldr)
- [Key Takeaways](#key-takeaways)
- [Introduction](#introduction)
- [Writing HTTP Client SDK](#writing-http-client-sdk)
  - [Client Lifetime](#client-lifetime)
- [Consuming API Clients](#consuming-api-clients)
  - [Consuming API Clients. HttpClientFactory](#consuming-api-clients-httpclientfactory)
- [Extending HTTP Client SDKs. Adding cross-cutting concerns via DelegatingHandler](#extending-http-client-sdks-adding-cross-cutting-concerns-via-delegatinghandler)
  - [Third-Party Extensions](#third-party-extensions)
- [Testing HTTP Client SDKs](#testing-http-client-sdks)
- [Writing HTTP Client SDK. Declarative approach](#writing-http-client-sdk-declarative-approach)
- [Consuming API Clients. Refit](#consuming-api-clients-refit)
- [Writing HTTP Client SDK. Automated approach](#writing-http-client-sdk-automated-approach)
- [Choosing the right approach](#choosing-the-right-approach)
- [Summary](#summary)
- [Reference](#reference)

## Key Takeaways

1. Writing and maintaining HTTP Client SDKs is a very important skill for modern .NET developers working with distributed systems.
2. In order to properly manage HTTP connections, you need to design your API Clients to be ready to be consumed from any Dependency Injection container.
3. A good client SDK is composable, providing straightforward ways to configure and extend it.
4. Testing HTTP Client SDKs can be very beneficial in certain scenarios and it gives you additional confidence in your code.
5. There are many ways of developing HTTP Client SDKs. This article helps you to choose the right one according to your scenario.

## Introduction

Today's cloud-based, microservice-based or internet-of-things applications often depend on communicating with other systems across a network. Each service runs in its process and solves a bounded set of problems. Communication between services is based on a lightweight mechanism, often an HTTP resource API.

From a .NET developer perspective, we want to provide a consistent and manageable way of integrating with a particular service in the form of a distributable package. Preferably, we also want to ship the service integration code we develop as a NuGet package and share it with other people, teams, or even organizations. In this article, I will share many aspects of creating and using HTTP Client SDKs using .NET 6.

Client SDKs provide a meaningful abstraction layer over remote service. Essentially, it allows making [Remote Procedure Calls (RPC)](https://en.wikipedia.org/wiki/Remote_procedure_call). The responsibility of a Client SDK is to serialize some data, send it to remote, deserialize and process a response.

The main benefits of API SDKs:

1. It speedups the API integration process
2. Provides a consistent and standard approach
3. Gives somewhat control to service owners over the way APIs are consumed

## Writing HTTP Client SDK

Throughout this article, we will write full-functioning [Dad Jokes API Client](https://rapidapi.com/KegenGuyll/api/dad-jokes/). It serves dad jokes, let's have some fun. It is a good idea to start from the contract.

```csharp
public interface IDadJokesApiClient
{
    Task<JokeSearchResponse> SearchAsync(
      string term, CancellationToken cancellationToken);

    Task<Joke> GetJokeByIdAsync(
        string id, CancellationToken cancellationToken);

    Task<Joke> GetRandomJokeAsync(CancellationToken cancellationToken);
}

public class JokeSearchResponse
{
    public bool Success { get; init; }

    public List<Joke> Body { get; init; } = new();
}

public class Joke
{
    public string Punchline { get; set; } = default!;

    public string Setup { get; set; } = default!;

    public string Type { get; set; } = default!;
}
```

The contract is created based on an API you are integrating with. My general recommendations are to develop common-purpose APIs and follow [Robustness Principle](https://en.wikipedia.org/wiki/Robustness_principle) and [Principle of least astonishment](https://en.wikipedia.org/wiki/Principle_of_least_astonishment). But it is totally fine if you want to modify and transform data contract based on your needs. Just think about it from a consumer perspective.

The bread and butter of HTTP-based integrations is `HttpClient`. It contains everything you need to successfully work with [HTTP](https://datatracker.ietf.org/doc/html/rfc2616/) abstractions.

```csharp
public class DadJokesApiClient : IDadJokesApiClient
{
    private readonly HttpClient httpClient;

    public DadJokesApiClient(HttpClient httpClient) =>
        this.httpClient = httpClient;
}
```

Usually, we deal with JSON over HTTP APIs, so in .NET 5 `System.Net.Http.Json` namespace was added to BCL. It provides many extension methods for `HttpClient` and `HttpContent` that perform serialization and deserialization using `System.Text.Json`. If you don't have something complex and exotic I would suggest using `System.Net.Http.Json` because it frees you from writing boilerplate code. Not only it is boring, but it also is not trivial to get it right in the most efficient and bug-free way from the get-go. I suggest you check [Steves' Gordon blog post - sending and receiving JSON using HttpClient](https://www.stevejgordon.co.uk/sending-and-receiving-json-using-httpclient-with-system-net-http-json)

```csharp
public async Task<Joke> GetRandomJokeAsync(CancellationToken cancellationToken)
{
    var jokes = await this.httpClient.GetFromJsonAsync<JokeSearchResponse>(
        ApiUrlConstants.GetRandomJoke, cancellationToken);

    if (jokes is { Body.Count: 0 } or { Success: false })
    {
        // consider creating custom exceptions for situations like this
        throw new InvalidOperationException("This API is no joke.");
    }

    return jokes.Body.First();
}
```

💡 Tip: You may want to create some centralized place to manage the endpoints URLs, like this:

```csharp
public static class ApiUrlConstants
{
    public const string JokeSearch = "/joke/search";

    public const string GetJokeById = "/joke";

    public const string GetRandomJoke = "/random/joke";
}
```

💡 Tip: If you need to deal with complex URIs - use [Flurl](https://flurl.dev/docs/fluent-url/). It provides fluent URL building experience.

```csharp
public async Task<Joke> GetJokeByIdAsync(string id, CancellationToken cancellationToken)
{
    // $"{ApiUrlConstants.GetJokeById}/{id}"
    var path = ApiUrlConstants.GetJokeById.AppendPathSegment(id);

    var joke = await this.httpClient.GetFromJsonAsync<Joke>(path, cancellationToken);

    return joke ?? new();
}
```

Next, we need to specify required headers (or some other required configuration). We want to provide a flexible mechanism for configuring `HttpClient` used as part of SDK. In this case, we need to supply credentials in the custom header and specify a well-known "Accept" header.

💡 Tip: Expose high-level building blocks as `HttpClientExtensions`. It makes it easy to discover API specific configuration. For example, if you have a custom authorization mechanism it should be supported by SDK (at least provide documentation for it).

```csharp
public static class HttpClientExtensions
{
    public static HttpClient AddDadJokesHeaders(
        this HttpClient httpClient, string host, string apiKey)
    {
        var headers = httpClient.DefaultRequestHeaders;
        headers.Add(ApiConstants.HostHeader, new Uri(host).Host);
        headers.Add(ApiConstants.ApiKeyHeader, apiKey);

        return httpClient;
    }
}
```

### Client Lifetime

To construct `DadJokesApiClient` we need to create `HttpClient`. As you know, `HttpClient` implements `IDisposable` because there is an underlying unmanageable resource - TCP connection. There is a limited amount of concurrent TCP connections that can be opened simultaneously on a single machine. So, it brings an important question - "Should I create HttpClient every time I need it or only once during an application startup?"

`HttpClient` is actually a shared object. This means that under the covers it is [reentrant](https://en.wikipedia.org/wiki/Reentrancy_(computing)) and thread-safe. Instead of creating a new instance of `HttpClient` for each execution, you should share a single instance of `HttpClient`. However, this comes with its own set of issues. For example, the client will keep connections open for the lifespan of the application, it won't respect the [DNS TTL](https://en.wikipedia.org/wiki/Time_to_live) settings and it will never get DNS updates. So this isn't a perfect solution either.

Basically, you need to manage a pool of TCP connections that are disposed from time to time to respect DNS updates. This is exactly what `HttpClientFactory` does. The official [documentation describes](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/use-httpclientfactory-to-implement-resilient-http-requests) `HttpClientFactory` as being "an opinionated factory for creating HttpClient instances to be used in your applications". We will see how to use it in a moment.

Each time you get an `HttpClient` object from the `IHttpClientFactory`, a new instance is returned. But each `HttpClient` uses an `HttpMessageHandler` that's pooled and reused by the `IHttpClientFactory` to reduce resource consumption. Pooling of handlers is desirable as each handler typically manages its own underlying HTTP connections. Some handlers also keep connections open indefinitely, which can prevent the handler from reacting to DNS changes. `HttpMessageHandler` has a limited lifetime.

Down below you can see how `HttpClientFactory` comes into play when using `HttpClient` managed by DI.

![http-factory](/assets/http-sdk/http-factory.png)

## Consuming API Clients

The very basic scenario is a console application without a dependency injection container. The goal here is to give consumers the fastest way possible to integrate.

💡 Create static factory method that creates an API Client.

```csharp
public static class DadJokesApiClientFactory
{
    public static IDadJokesApiClient Create(string host, string apiKey)
    {
        var httpClient = new HttpClient()
        {
            BaseAddress = new Uri(host);
        }
        ConfigureHttpClient(httpClient, host, apiKey);

        return new DadJokesApiClient(httpClient);
    }

    internal static void ConfigureHttpClient(
        HttpClient httpClient, string host, string apiKey)
    {
        ConfigureHttpClientCore(httpClient);
        httpClient.AddDadJokesHeaders(host, apiKey);
    }

    internal static void ConfigureHttpClientCore(HttpClient httpClient)
    {
        httpClient.DefaultRequestHeaders.Accept.Clear();
        httpClient.DefaultRequestHeaders.Accept.Add(new("application/json"));
    }
}
```

Finally, we can use `IDadJokesApiClient` from the console application:

```csharp
var host = "https://dad-jokes.p.rapidapi.com";
var apiKey = "<token>";

var client = DadJokesApiClientFactory.Create(host, apiKey);
var joke = await client.GetRandomJokeAsync();

Console.WriteLine($"{joke.Setup} {joke.Punchline}");
```

![manual-client-console-host](/assets/http-sdk/manual-client-console-host.png)

### Consuming API Clients. HttpClientFactory

The next step is to configure `HttpClient` as part of a *Dependency Injection* container. I will not go into details, there is a lot of good stuff on the internet. Once again, there is a really good article from [Steve's Gordon - HttpClientFactory in ASP.NET Core](https://www.stevejgordon.co.uk/httpclientfactory-named-typed-clients-aspnetcore)

To add pooled `HttpClient` to DI you need to use `IServiceCollection.AddHttpClient` from `Microsoft.Extensions.Http`.

💡 Provide a custom extension method to add typed `HttpClient` in DI.

```csharp
public static class ServiceCollectionExtensions
{
    public static IHttpClientBuilder AddDadJokesApiClient(
        this IServiceCollection services,
        Action<HttpClient> configureClient) =>
            services.AddHttpClient<IDadJokesApiClient, DadJokesApiClient>((httpClient) =>
            {
                DadJokesApiClientFactory.ConfigureHttpClientCore(httpClient);

                configureClient(httpClient);
            });
}
```

Use extension method like the following:

```csharp
var host = "https://da-jokes.p.rapidapi.com";
var apiKey = "<token>";

var services = new ServiceCollection();

services.AddDadJokesApiClient(httpClient =>
{
    httpClient.BaseAddress = new(host);
    httpClient.AddDadJokesHeaders(host, apiKey);
});

var provider = services.BuildServiceProvider();
var client = provider.GetRequiredService<IDadJokesApiClient>();

var joke = await client.GetRandomJokeAsync();

logger.Information($"{joke.Setup} {joke.Punchline}");
```

As you see, you can use `IHttpClientFactory` outside of ASP.NET Core. For example, console applications, workers, lambdas, etc.

Let's see it running:

![manual-client-console-di-host](/assets/http-sdk/manual-client-console-di-host.png)

The interesting part here is that clients created by DI automatically logs outgoing requests. It makes development and troubleshooting so much easier.

```text
{SourceContext}[{EventId}] // pattern

System.Net.Http.HttpClient.IDadJokesApiClient.LogicalHandler [{ Id: 100, Name: "RequestPipelineStart" }]
    System.Net.Http.HttpClient.IDadJokesApiClient.ClientHandler [{ Id: 100, Name: "RequestStart" }]
    System.Net.Http.HttpClient.IDadJokesApiClient.ClientHandler [{ Id: 101, Name: "RequestEnd" }]
System.Net.Http.HttpClient.IDadJokesApiClient.LogicalHandler [{ Id: 101, Name: "RequestPipelineEnd" }]
```

The most common scenario is web applications. Here is .NET 6 MinimalAPI example:

```csharp
var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;
var configuration = builder.Configuration;
var host = configuration["DadJokesClient:host"];

services.AddDadJokesApiClient(httpClient =>
{
    httpClient.BaseAddress = new(host);
    httpClient.AddDadJokesHeaders(host, configuration["DADJOKES_TOKEN"]);
});

var app = builder.Build();

app.MapGet("/", async (IDadJokesApiClient client) => await client.GetRandomJokeAsync());

app.Run();
```

![manual-client-api-host](/assets/http-sdk/manual-client-api-host.png)

```json
{
  "punchline": "They are all paid actors anyway",
  "setup": "We really shouldn't care what people at the Oscars say",
  "type": "actor"
}
```

## Extending HTTP Client SDKs. Adding cross-cutting concerns via DelegatingHandler

`HttpClient` provide an extension point - *message handler*. A message handler is a class that receives an HTTP request and returns an HTTP response. A wide variety of problems could be expressed as [cross-cutting concerns](https://en.wikipedia.org/wiki/Cross-cutting_concern). For example, logging, authentication, caching, header forwarding, auditing, etc. Aspect-oriented programming aims to encapsulate cross-cutting concerns into aspects to retain modularity. Typically, a series of message handlers are chained together. The first handler receives an HTTP request, does some processing, and gives the request to the next handler. At some point, the response is created and goes back up the chain.

```csharp
// supports the most common requirements for most applications
public abstract class HttpMessageHandler : IDisposable
{}
// plug a handler into a handler chain
public abstract class DelegatingHandler : HttpMessageHandler
{}
```

![delegating-handler](/assets/http-sdk/delegating-handler.png)

**Task**. Assume you need to copy a list of headers from ASP.NET Core `HttpContext` and pass them to all outgoing requests made by *Dad Jokes API* client.

```csharp
public class HeaderPropagationMessageHandler : DelegatingHandler
{
    private readonly HeaderPropagationOptions options;
    private readonly IHttpContextAccessor contextAccessor;

    public HeaderPropagationMessageHandler(
        HeaderPropagationOptions options,
        IHttpContextAccessor contextAccessor)
    {
        this.options = options;
        this.contextAccessor = contextAccessor;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (this.contextAccessor.HttpContext != null)
        {
            foreach (var headerName in this.options.HeaderNames)
            {
                var headerValue = this.contextAccessor
                    .HttpContext.Request.Headers[headerName];

                request.Headers.TryAddWithoutValidation(
                    headerName, (string[])headerValue);
            }
        }

        return base.SendAsync(request, cancellationToken);
    }
}

public class HeaderPropagationOptions
{
    public IList<string> HeaderNames { get; set; } = new List<string>();
}
```

Now, we want to "plug" `DelegatingHandler` into `HttpClient` request pipeline.

For non-`IHttpClientFactory` scenarios, we want clients to specify a list of `DelegatingHandler` so we can build an underlying chain for `HttpClient`.

```csharp
//DadJokesApiClientFactory.cs
public static IDadJokesApiClient Create(
    string host,
    string apiKey,
    params DelegatingHandler[] handlers)
{
    var httpClient = new HttpClient();

    if (handlers.Length > 0)
    {
        _ = handlers.Aggregate((a, b) =>
        {
            a.InnerHandler = b;
            return b;
        });
        httpClient = new(handlers[0]);
    }
    httpClient.BaseAddress = new Uri(host);

    ConfigureHttpClient(httpClient, host, apiKey);

    return new DadJokesApiClient(httpClient);
}
```

So, without DI container, extended `DadJokesApiClient` could be constructed like this:

```csharp
var loggingHandler = new LoggingMessageHandler(); //outermost
var authHandler = new AuthMessageHandler();
var propagationHandler = new HeaderPropagationMessageHandler();
var primaryHandler = new HttpClientHandler();  // the default handler used by HttpClient

DadJokesApiClientFactory.Create(
    host, apiKey,
    loggingHandler, authHandler, propagationHandler, primaryHandler);

// LoggingMessageHandler ➝ AuthMessageHandler ➝ HeaderPropagationMessageHandler ➝ HttpClientHandler
```

For DI container scenarios, on another hand, we want to provide auxiliary extension method to easily plug `HeaderPropagationMessageHandler` by using `IHttpClientBuilder.AddHttpMessageHandler`.

```csharp
public static class HeaderPropagationExtensions
{
    public static IHttpClientBuilder AddHeaderPropagation(
        this IHttpClientBuilder builder,
        Action<HeaderPropagationOptions> configure)
    {
        builder.Services.Configure(configure);
        builder.AddHttpMessageHandler((sp) =>
        {
            return new HeaderPropagationMessageHandler(
                sp.GetRequiredService<IOptions<HeaderPropagationOptions>>().Value,
                sp.GetRequiredService<IHttpContextAccessor>());
        });

        return builder;
    }
}
```

Here is how extended MinimalAPI example looks like:

```csharp
var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;
var configuration = builder.Configuration;
var host = configuration["DadJokesClient:host"];

services.AddDadJokesApiClient(httpClient =>
{
    httpClient.BaseAddress = new(host);
    httpClient.AddDadJokesHeaders(host, configuration["DADJOKES_TOKEN"]);
}).AddHeaderPropagation(o => o.HeaderNames.Add("X-Correlation-ID"));

var app = builder.Build();

app.MapGet("/", async (IDadJokesApiClient client) => await client.GetRandomJokeAsync());

app.Run();
```

💡 Sometimes functionality like this is reused by other services. You might want to take it one step further and factor out all shared code into a common NuGet package and use it in HTTP Client SDKs.

### Third-Party Extensions

Not only we can write our own message handlers. There is a lot of useful NuGet packages provided and supported by .NET OSS community. Here are my favorites:

💡 *Resiliency patterns* - retry, cache, fallback, etc.: Very often, in distrusted systems world you need to ensure high availability by incorporating some resilience policies. Luckily, we have a built-in solution to build and define policies in .NET - [Polly](https://github.com/App-vNext/Polly). There is out-of-the-box integration with `IHttpClientFactory` provided by Polly. This uses a convenience method, [IHttpClientBuilder.AddTransientHttpErrorPolicy](https://docs.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.pollyhttpclientbuilderextensions.addtransienthttperrorpolicy). It configures a policy to handle errors typical of HTTP calls: `HttpRequestException`, HTTP 5XX status codes (server errors), HTTP 408 status code (request timeout).

```csharp
services.AddDadJokesApiClient(httpClient =>
{
    httpClient.BaseAddress = new(host);
}).AddTransientHttpErrorPolicy(builder => builder.WaitAndRetryAsync(new[]
{
    TimeSpan.FromSeconds(1),
    TimeSpan.FromSeconds(5),
    TimeSpan.FromSeconds(10)
}));
```

For example, transient errors might be handled proactively by using *Retry* and *Circuit Breaker* patterns. Usually, we use a retry pattern when there is a hope that downstream service will self-correct eventually. Waiting between retries provides an opportunity for a downstream service to stabilize. It is common to use retries based on the [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff) algorithm. On paper, it sounds great, but in real-world scenarios, the retry pattern may be overused. Additional retries might be the source of additional load or spikes. In the worst case, resources in the caller may then become exhausted or excessively blocked, waiting for replies which will never come causing an upstream-cascading failure.

This is when the *Circuit Breaker* pattern comes into play. It detects the level of faults and prevents calls to a downstream service when a fault threshold is exceeded. Use this pattern when there is no chance of succeeding - for example, where a subsystem is completely offline or struggling under load. The idea behind *Circuit Breaker* is pretty straightforward, although, you might build something more complex on top of it. When faults exceed the threshold, calls are placed through the circuit, so instead of processing a request, we practice the fail-fast approach, throwing an exception immediately.

Polly is really powerful and it provides a way to combine resilience strategies. See [PolicyWrap](https://github.com/App-vNext/Polly/wiki/PolicyWrap).

Here is a classification of the strategies you might want to use:

![http-client-sdk-polly](/assets/http-sdk/http-client-sdk-polly.png)

Designing reliable systems could be a challenging task, I suggest you investigate the subject on your own. Here is a good introduction - [.NET microservices - Architecture e-book: Implement resilient applications](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/)

💡 *Authentication in OAuth2/OIDC*: If you need to manage user and client access tokens I suggest using [IdentityModel.AspNetCore](https://github.com/IdentityModel/IdentityModel.AspNetCore). It acquires, caches, and rotates tokens for you, see the [docs](https://identitymodel.readthedocs.io/en/latest/aspnetcore/overview.html).

```csharp
// adds user and client access token management
services.AddAccessTokenManagement(options =>
{
    options.Client.Clients.Add("identity-provider", new ClientCredentialsTokenRequest
    {
        Address = "https://demo.identityserver.io/connect/token",
        ClientId = "my-awesome-service",
        ClientSecret = "secret",
        Scope = "api" // optional
    });
});
// registers HTTP client that uses the managed client access token
// adds the access token handler to HTTP client registration
services.AddDadJokesApiClient(httpClient =>
{
    httpClient.BaseAddress = new(host);
}).AddClientAccessTokenHandler(); 
```

## Testing HTTP Client SDKs

By this time, you should be pretty comfortable designing and writing your own HTTP Client SDKs. The only thing that is left is to write some tests to ensure expected behavior. Note, it might be a good idea to skip extensive unit testing and write more integration or e2e to ensure proper integration. For now, I will show you how to unit test `DadJokesApiClient`.

As you have seen previously, `HttpClient` is extensible. Furthermore, we can replace the standard `HttpMessageHandler` with the test version. So, instead of sending actual requests over the wire, we will use the mock. This technique opens tons of opportunities because we can simulate all kinds of behaviors of `HttpClient` that otherwise could be hard to replicate in a normal situation.

Let's define reusable methods to create a mock of `HttpClient` that we will pass as a dependency to `DadJokesApiClient`.

```csharp
public static class TestHarness
{
    public static Mock<HttpMessageHandler> CreateMessageHandlerWithResult<T>(
        T result, HttpStatusCode code = HttpStatusCode.OK)
    {
        var messageHandler = new Mock<HttpMessageHandler>();
        messageHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage()
            {
                StatusCode = code,
                Content = new StringContent(JsonSerializer.Serialize(result)),
            });

        return messageHandler;
    }

    public static HttpClient CreateHttpClientWithResult<T>(
        T result, HttpStatusCode code = HttpStatusCode.OK)
    {
        var httpClient = new HttpClient(CreateMessageHandlerWithResult(result, code).Object)
        {
            BaseAddress = new("https://api-client-under-test.com"),
        };

        return httpClient;
    }
}
```

From this point, unit testing is a pretty simple process:

```csharp
public class DadJokesApiClientTests
{
    [Theory, AutoData]
    public async Task GetRandomJokeAsync_SingleJokeInResult_Returned(Joke joke)
    {
        // Arrange
        var response = new JokeSearchResponse
        {
            Success = true,
            Body = new() { joke }
        };
        var httpClient = CreateHttpClientWithResult(response);
        var sut = new DadJokesApiClient(httpClient);

        // Act
        var result = await sut.GetRandomJokeAsync();

        // Assert
        result.Should().BeEquivalentTo(joke);
    }

    [Fact]
    public async Task GetRandomJokeAsync_UnsuccessfulJokeResult_ExceptionThrown()
    {
        // Arrange
        var response = new JokeSearchResponse();
        var httpClient = CreateHttpClientWithResult(response);
        var sut = new DadJokesApiClient(httpClient);

        // Act
        // Assert
        await FluentActions.Invoking(() => sut.GetRandomJokeAsync())
            .Should().ThrowAsync<InvalidOperationException>();
    }
}
```

Using `HttpClient` is the most flexible approach. You have full control over integration with APIs. But, there is a downside, you need to write a lot of boilerplate code. In some situations, an API you are integrating with is trivial so you don't really need all capabilities provided by `HttpClient`, `HttpRequestMessage`, `HttpResponseMessage`.

Pros ➕:

* Full control over behavior and data contracts. You can even write "smart" API Client and move some logic inside SDK if it makes sense for a particular scenario. For example, you can throw custom exceptions, transform requests and responses, provide default values for headers, etc.
* Full control over serialization and deserialization process
* Easy to debug and troubleshoot. A stack trace is simple and you can always spin up the debugger to see what is happening under the hood.

Cons ➖:

* Need to write a lot of repetitive code
* Someone should maintain a code base in case of API changes and bugs. This is a tedious and error-prone process.

## Writing HTTP Client SDK. Declarative approach

> The less code, the fewer bugs.

[Refit](https://github.com/reactiveui/refit) is an automatic type-safe REST library for .NET. It turns your REST API into a live interface. Refit uses `System.Text.Json` as the default JSON serializer.

Every method must have an HTTP attribute that provides the request method and relative URL.

```csharp
using Refit;

public interface IDadJokesApiClient
{
    /// <summary>
    /// Searches jokes by term.
    /// </summary>
    [Get("/joke/search")]
    Task<JokeSearchResponse> SearchAsync(
        string term,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a joke by id.
    /// </summary>
    [Get("/joke/{id}")]
    Task<Joke> GetJokeByIdAsync(
        string id,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a random joke.
    /// </summary>
    [Get("/random/joke")]
    Task<JokeSearchResponse> GetRandomJokeAsync(
        CancellationToken cancellationToken = default);
}
```

Refit generates type that implements `IDadJokesApiClient` based on information provided by `Refit.HttpMethodAttribute`

## Consuming API Clients. Refit

The approach is the same as for vanilla `HttpClient` integration, but instead of constructing a client manually, we use static method provided by Refit.

```csharp
public static class DadJokesApiClientFactory
{
    public static IDadJokesApiClient Create(
        HttpClient httpClient,
        string host,
        string apiKey)
    {
        httpClient.BaseAddress = new Uri(host);

        ConfigureHttpClient(httpClient, host, apiKey);

        return RestService.For<IDadJokesApiClient>(httpClient);
    }
    // ...
}
```

For DI container scenarios, we can use `Refit.HttpClientFactoryExtensions.AddRefitClient` extension method.

```csharp
public static class ServiceCollectionExtensions
{
    public static IHttpClientBuilder AddDadJokesApiClient(
        this IServiceCollection services,
        Action<HttpClient> configureClient)
    {
        var settings = new RefitSettings()
        {
            ContentSerializer = new SystemTextJsonContentSerializer(new JsonSerializerOptions()
            {
                PropertyNameCaseInsensitive = true,
                WriteIndented = true,
            })
        };

        return services.AddRefitClient<IDadJokesApiClient>(settings)
            .ConfigureHttpClient((httpClient) =>
            {
                DadJokesApiClientFactory.ConfigureHttpClient(httpClient);
                configureClient(httpClient);
            });
    }
}
```

Usage:

```csharp

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;

Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateBootstrapLogger();
builder.Host.UseSerilog((ctx, cfg) => cfg.WriteTo.Console());

var services = builder.Services;

services.AddDadJokesApiClient(httpClient =>
{
    var host = configuration["DadJokesClient:host"];
    httpClient.BaseAddress = new(host);
    httpClient.AddDadJokesHeaders(host, configuration["DADJOKES_TOKEN"]);
});

var app = builder.Build();

app.MapGet("/", async Task<Joke> (IDadJokesApiClient client) =>
{
    var jokeResponse = await client.GetRandomJokeAsync();

    return jokeResponse.Body.First(); // unwraps JokeSearchResponse
});

app.Run();
```

Note, since the contract of the generated client should match the underlying data contract, we no longer have control of contract transformation and this responsibility is delegated to consumers.

Let's see how the code above works in practice. The output of MinimalAPI example is different because I've added Serilog logging.

![declarative-client-api-host](/assets/http-sdk/declarative-client-api-host.png)

```json
{
  "punchline": "Forgery.",
  "setup": "Why was the blacksmith charged with?",
  "type": "forgery"
}
```

As usual, there are some pros and some cons:

Pros ➕:

* Easy to use and develop API clients.
* Highly configurable. Flexible enough to get things done.
* No need for additional unit testing

Cons ➖:

* Hard to troubleshoot. Sometimes it can be hard to understand how the generated code works. For example, there is a mismatch in configuration.
* Requires other team members to understand how to read and write code developed with Refit.
* Still consumes some time for medium/large APIs.

Honorable mentions: [RestEase](https://github.com/canton7/RestEase), [RESTFulSense](https://github.com/hassanhabib/RESTFulSense)

## Writing HTTP Client SDK. Automated approach

There is a way to fully automate HTTP Client SDKs. The OpenAPI/Swagger specification uses JSON and JSON Schema to describe a RESTful web API. The [NSwag](https://github.com/RicoSuter/NSwag) project provides tools to generate client code from these OpenAPI specifications. Everything can be automated via CLI (distributed via NuGet tool or build target; or NPM).

Actually, *Dad Jokes API* doesn't provide OpenAPI, so I had to write it manually. Fortunately, it was quite easy to do:

```yaml
openapi: '3.0.2'
info:
  title: Dad Jokes API
  version: '1.0'
servers:
  - url: https://dad-jokes.p.rapidapi.com
paths:
  /joke/{id}:
    get:
      description: ''
      operationId: 'GetJokeById'
      parameters:
      - name: "id"
        in: "path"
        description: ""
        required: true
        schema:
          type: "string"
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                "$ref": "#/components/schemas/Joke"
  /random/joke:
    get:
      description: ''
      operationId: 'GetRandomJoke'
      parameters: []
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                "$ref": "#/components/schemas/JokeResponse"
  /joke/search:
    get:
      description: ''
      operationId: 'SearchJoke'
      parameters: []
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                "$ref": "#/components/schemas/JokeResponse"
components:
  schemas:
    Joke:
      type: object
      required:
      - _id
      - punchline
      - setup
      - type
      properties:
        _id:
          type: string
        type:
          type: string
        setup:
          type: string
        punchline:
          type: string
    JokeResponse:
      type: object
      properties:
        sucess:
          type: boolean
        body:
          type: array
          items:
            $ref: '#/components/schemas/Joke'
```

Now, we want to generate HTTP Client SDK automatically. Let's use [NSwagStudio](https://github.com/RicoSuter/NSwag/wiki/NSwagStudio).

![nswag-example](/assets/http-sdk/nswag-example.png)

Here is how the generated `IDadJokesApiClient` looks like (XML comments are deleted for brevity):

```csharp
    [System.CodeDom.Compiler.GeneratedCode("NSwag", "13.10.9.0 (NJsonSchema v10.4.1.0 (Newtonsoft.Json v12.0.0.0))")]
    public partial interface IDadJokesApiClient
    {
        System.Threading.Tasks.Task<Joke> GetJokeByIdAsync(string id);
    
        System.Threading.Tasks.Task<Joke> GetJokeByIdAsync(string id, System.Threading.CancellationToken cancellationToken);
    
        System.Threading.Tasks.Task<JokeResponse> GetRandomJokeAsync();
    
        System.Threading.Tasks.Task<JokeResponse> GetRandomJokeAsync(System.Threading.CancellationToken cancellationToken);
    
        System.Threading.Tasks.Task<JokeResponse> SearchJokeAsync();
    
        System.Threading.Tasks.Task<JokeResponse> SearchJokeAsync(System.Threading.CancellationToken cancellationToken);
    }
```

As usual, we want to provide the registration of typed client as an extension method:

```csharp
public static class ServiceCollectionExtensions
{
    public static IHttpClientBuilder AddDadJokesApiClient(
        this IServiceCollection services, Action<HttpClient> configureClient) => 
            services.AddHttpClient<IDadJokesApiClient, DadJokesApiClient>(
                httpClient => configureClient(httpClient));
}
```

Usage:

```csharp
var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;
var services = builder.Services;

services.AddDadJokesApiClient(httpClient =>
{
    var host = configuration["DadJokesClient:host"];
    httpClient.BaseAddress = new(host);
    httpClient.AddDadJokesHeaders(host, configuration["DADJOKES_TOKEN"]);
});

var app = builder.Build();

app.MapGet("/", async Task<Joke> (IDadJokesApiClient client) =>
{
    var jokeResponse = await client.GetRandomJokeAsync();

    return jokeResponse.Body.First();
});

app.Run();
```

Let's run it and enjoy the last joke of this article:

```json
{
  "punchline": "And it's really taken off",
  "setup": "So I invested in a hot air balloon company...",
  "type": "air"
}
```

Pros ➕:

* Based on the well-known specification
* Supported by rich set of tools and vibrant community
* Fully automated, new SDK can be generated as part of CI/CD process every time OpenAPI specification is changed
* Generate SDKs for multiple programming languages
* Relatively easy to troubleshoot since we can see the code generated by the toolchain.

Cons ➖:

* Can't be applied without proper OpenAPI specification
* Hard to customize and control the contract of generated API Client

Honorable mentions: [AutoRest](https://github.com/Azure/AutoRest), [Visual Studio Connected Services](https://devblogs.microsoft.com/dotnet/generating-http-api-clients-using-visual-studio-connected-services/)

## Choosing the right approach

We have three different ways of producing SDK clients. The selection process can be simplified to the next categories

> I'm a simple man/woman/non-binary, I want to have full control over my HTTP Client integration.

Use manual approach.

> I'm a busy man/woman/non-binary, but I still want to have somewhat control.

Use a declarative approach.

> I'm a lazy man/woman/non-binary. Do the thing for me.

Use an automated approach.

Decision chart:

![decision-chart](/assets/http-sdk/http-client-sdk-design-decision-chart.png)

---

## Summary

We've reviewed different ways of developing HTTP Client SDKs. Choosing the right approach depends on use-case and requirements, but I hope this article gives you nice foundations for making the best design decisions. Thank you.

## Reference

* <https://github.com/NikiforovAll/http-sdk-guide>
* <https://www.stevejgordon.co.uk/sending-and-receiving-json-using-httpclient-with-system-net-http-json>
* <https://devblogs.microsoft.com/dotnet/net-5-new-networking-improvements/>
* <https://www.stevejgordon.co.uk/httpclientfactory-aspnetcore-outgoing-request-middleware-pipeline-delegatinghandlers>
* <https://www.aspnetmonsters.com/2016/08/2016-08-27-httpclientwrong/>
* <https://www.stevejgordon.co.uk/httpclient-creation-and-disposal-internals-should-i-dispose-of-httpclient>
* <https://www.assemblyai.com/blog/getting-started-with-httpclientfactory-in-c-sharp-and-net-5/>
* <https://www.stevejgordon.co.uk/httpclientfactory-named-typed-clients-aspnetcore>
* <https://andrewlock.net/understanding-scopes-with-ihttpclientfactory-message-handlers/>
* <https://andrewlock.net/exporing-the-code-behind-ihttpclientfactory/>
* <https://docs.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/>
* <https://app.pluralsight.com/library/courses/using-httpclient-consume-apis-dot-net>
