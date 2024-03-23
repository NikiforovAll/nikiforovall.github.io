---
layout: post
title: "A Comprehensive Guide to OpenAPI Client Generation with Kiota. Deep dive (Part 2)"
categories: [ dotnet, aspnetcore ]
tags: [ dotnet, aspnetcore, openapi, aspire, cli ]
published: true
shortinfo: info info info
fullview: false
comments: true
hide-related: true
mermaid: true
---

> Source code: <https://github.com/NikiforovAll/kiota-getting-started>

## Introduction

In the previous blog post, we learned the basics of **Kiota**. In this post, I want to share more details on how to apply it in production scenarios in a more sophisticated manner.

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

Here is `App.csproj`

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

And here is `App.Client.csproj`

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

<div class="mermaid">
graph LR
    AppClient --> AppSdk["App.Sdk"]
    AppSdk --> App
</div>

## Generate HTTP Client for ASP.NET Core applications

ASP.NET Core has built-in support for OpenAPI, also known as Swagger. This support allows developers to generate API documentation directly from their code. The quality of the generated OpenAPI specification largely depends on the amount of metadata provided by the developer in the form of attributes and comments. The more detailed and accurate this metadata is, the more precise and useful the generated OpenAPI specification will be. This, in turn, improves the quality of the client SDKs generated from the OpenAPI specification.

## Automatic OpenAPI specification generation

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

```csharp
app.MapGet("/my/trending", async (AppApiClient client) =>
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

💡Note, the `BaseUrl` is based on Aspire convention. Here is App.AppHost:

```csharp
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

![demo2](/assets/kiota/demo2.png)

And here is trace example from **Aspire.Dashboard**:

![trace-example](/assets/kiota/trace-example.png)

💡Note, Http instrumentation/tracing works only for clients resolved through DI container. Later, I will show you how to properly add `AppApiClient` so it uses `HttpClient` from `IHttpClientFactory`.

## IHttpClientFactory

As you probably know, there is a better way of working with `HttpClient` in .NET, there are well-known client lifetime issues that are solved by `IHttpClientFactory`. I will show you how to use client generated by **Kiota** as typed client. See: [Typed-client approach](https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory#typed-clients)

## Cross-Cutting Concerns and Resilience

## Testing

## Conclusion

## References

* <https://www.meziantou.net/generate-openapi-specification-at-build-time-from-the-code-in-asp-net-core.htm>
* <https://devblogs.microsoft.com/dotnet/introducing-dotnet-aspire-simplifying-cloud-native-development-with-dotnet-8/>
* <https://devblogs.microsoft.com/dotnet/building-resilient-cloud-services-with-dotnet-8/>
