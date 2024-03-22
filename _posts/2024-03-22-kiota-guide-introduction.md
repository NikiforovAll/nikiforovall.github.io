---
layout: post
title: "A Guide to OpenAPI Client Generation with Kiota. Introduction (Part 1)"
categories: [ dotnet, aspnetcore ]
tags: [ dotnet, aspnetcore, openapi, aspire, cli ]
published: true
shortinfo: Introduces Kiota, explaining its purpose and relevance in the context of OpenAPI client generation. Highlights its features and benefits.
fullview: false
comments: true
hide-related: true
mermaid: true
---

> Source code: <https://github.com/NikiforovAll/kiota-getting-started>

## Introduction

**Kiota** is a powerful command line tool developed by **Microsoft** that simplifies the process of generating **API clients** for calling any **OpenAPI-described API**.

It gains traction, for example, GitHub teams decided to move away from the static landscape of the traditional Octokit, and now they are shipping SDKs using Kiota (ref: [github/Our move to generated SDKs](https://github.blog/2024-01-03-our-move-to-generated-sdks/))

### Purpose and Goal

**Kiota** aims to eliminate the need for developers to rely on different API SDKs for each API they interact with. So When you need to call multiple APIs, you can use **Kiota** to generate a consistent, strongly typed API client without having to learn a new library for every HTTP API.

### Key Features

* Language Agnostic: **Kiota** provides support for a wide range of languages, including C#, CLI, Go, Java, PHP, Python, Ruby, Swift, and TypeScript.
* Full OpenAPI Capabilities: It leverages the complete capabilities of OpenAPI descriptions.
* Minimal Code Generation: It generates only the necessary source code by building on a core library.
* Reduced External Dependencies: **Kiota** minimizes external dependencies.
* JSON Schema Integration: It uses JSON Schema descriptions to generate primitive-based model serialization and deserialization code.
* IDE Autocomplete: The generated code supports IDE autocomplete, aiding in API resource discovery.
* Full Access to HTTP Capabilities: Kiota ensures you have full access to HTTP features.
* Fine-Tuned Generation: Need only a specific part of the API? No problem. **Kiota** lets you filter the generation to the exact surface area you’re interested in.

## Use Kiota

Visit <https://learn.microsoft.com/en-us/openapi/kiota/install> to see various installation options, in our case, we will use `dotnet global-tool`

```bash
dotnet tool install --global Microsoft.OpenApi.Kiota
```

A noteworthy feature of the **Kiota** CLI is its endeavor to enhance discoverability by incorporating the search command `kiota search <searchTerm>`.

```bash
$ kiota search news
# Key                                                     Title                           Description
# apisguru::gov.bc.ca:news                                BC Gov News API Service 1.0     News API
# apisguru::microsoft.com:cognitiveservices-NewsSearch    News Search Client              The News Search API lets you send a
# apisguru::sportsdata.io:mlb-v3-rotoballer-premium-news  MLB v3 RotoBaller Premium News
# apisguru::sportsdata.io:nba-v3-rotoballer-premium-news  NBA v3 RotoBaller Premium News
# apisguru::sportsdata.io:nfl-v3-rotoballer-premium-news  NFL v3 RotoBaller Premium News
```

Let's say we want to know more about: `microsoft.com:cognitiveservices-NewsSearch`. 

```bash
$ kiota search apisguru::microsoft.com:cognitiveservices-NewsSearch
# Key: apisguru::microsoft.com:cognitiveservices-NewsSearch
# Title: News Search Client
# Description: The News Search API lets you send a search query to Bing and get back a list of news that are relevant to the search query. This section provides technical details about the query parameters and headers that you use to request news and the JSON response objects that contain them. For examples that show how to make requests, see [Searching the web for news](https://docs.microsoft.com/en-us/azure/cognitive-services/bing-news-search/search-the-web).
# Service:
# OpenAPI: https://raw.githubusercontent.com/APIs-guru/openapi-directory/gh-pages/v2/specs/microsoft.com/cognitiveservices-NewsSearch/1.0/swagger.json
```

We can check structure of the API by using `kiota show` command, but first, we need to download OpenAPI specification.

```bash
$ kiota download apisguru::microsoft.com:cognitiveservices-NewsSearch \
    --output ./src/NewsSearch.Sdk/OpenApi/NewsSearch.json
$ kiota show \
    --openapi ./src/NewsSearch.Sdk/OpenApi/NewsSearch.json
# /
#  └─news
#     ├─search
#     └─trendingtopics

# Hint: use the --include-path and --exclude-path options with glob patterns to filter the paths displayed.
# Example: kiota show -d "C:\Users\Oleksii_Nikiforov\dev\kiota-getting-started\.\src\NewsSearch.Sdk\OpenApi\NewsSearch.json" --include-path "**/foo"
```

## Demo

Now, we are ready to see how it works, but before we start I want to introduce you the demo application, note, it is intentionally complicated just to demonstrate various aspects of using **Kiota**:

We have an application (`App.Client`) that calls our application's API (`App API`). This application integrates with the Bing REST API. The unique aspect of this demo is that every HTTP client is automatically generated based on OpenAPI and **Kiota**.

### Components

As part of this post, we don't need to know about all components. You will learn more in future blog posts. For this post, focus on components marked with 🎯.

| Component | Description |
| --- | --- |
| 🎯`App` | Integrates with Bing REST API |
| 🎯`NewsSearch.Sdk` | Generated OpenAPI HTTP Client by Kiota. It's based on externally provided OpenAPI specification |
| `App.Sdk` | Generated OpenAPI HTTP Client by Kiota |
| `App.Client` | Invokes `App` via `App.Sdk` |
| `App.Client.Sdk` | Generated OpenAPI HTTP Client by Kiota |
| `App.Client.Cli` | Generated CLI Client by Kiota. Convention-based commands based on App.Client OpenAPI specification|
| `App.AppHost` | Aspire Host |
| `App.ServiceDefaults` | Reasonable service defaults |

<div class="mermaid">
graph LR
    App --> NewsSearchSdk["NewsSearch.Sdk"]
    App --> AppServiceDefaults["App.ServiceDefaults"]
    AppClient --> AppSdk["App.Sdk"]
    AppClient["App.Client"] --> AppServiceDefaults
    AppAppHost["App.AppHost"] --> App
    AppAppHost --> AppClient
</div>

---

**Our goal** is to add an endpoint to fetch trending topics by Country Code.

```csharp
var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;
var app = builder.Build();

app.MapGet("trending/{country:minlength(2):maxlength(2)}", (string? country) =>
{
    // TODO:
});

app.Run();
```

### Generate Client

So, first, we need to generate the client SDK based on OpenApi specification stored previously. Note, `--class-name` parameter specifies the name of the generated client - `NewsSearchApiClient`.

💡 As mentioned earlier, **Kiota** supports partial client generation by using `--include-path` option.

```bash
kiota generate -l CSharp \
    --log-level trace \
    --output ./src/NewsSearch.Sdk \
    --namespace-name NewsSearch.Sdk \
    --class-name NewsSearchApiClient \
    --include-path "**/trendingtopics" \
    --exclude-backward-compatible \
    --openapi ./src/NewsSearch.Sdk/OpenApi/NewsSearch.json
```

After that, we want to add required dependencies. Luckily, **Kiota** help with it by providing friendly instructions as part of `kiota info -l CSharp`

```bash
$ kiota info  -l CSharp
# The language CSharp is currently in Stable maturity level.

# Hint: use the install command to install the dependencies.
# Example:
#    dotnet add package Microsoft.Kiota.Abstractions --version 1.7.11
#    dotnet add package Microsoft.Kiota.Authentication.Azure --version 1.1.4
#    dotnet add package Microsoft.Kiota.Http.HttpClientLibrary --version 1.3.7
#    dotnet add package Microsoft.Kiota.Serialization.Form --version 1.1.5
#    dotnet add package Microsoft.Kiota.Serialization.Json --version 1.1.8
#    dotnet add package Microsoft.Kiota.Serialization.Multipart --version 1.1.3
#    dotnet add package Microsoft.Kiota.Serialization.Text --version 1.1.4
```

Here is how `NewsSearch.Sdk.csproj` looks like:

```xml
<Project Sdk="Microsoft.NET.Sdk">
    <ItemGroup>
        <PackageReference Include="Microsoft.Kiota.Abstractions" />
        <PackageReference Include="Microsoft.Kiota.Authentication.Azure" />
        <PackageReference Include="Microsoft.Kiota.Http.HttpClientLibrary" />
        <PackageReference Include="Microsoft.Kiota.Serialization.Form" />
        <PackageReference Include="Microsoft.Kiota.Serialization.Json" />
        <PackageReference Include="Microsoft.Kiota.Serialization.Multipart" />
        <PackageReference Include="Microsoft.Kiota.Serialization.Text" />
    </ItemGroup>
</Project>
```

Add a project `NewsSearch.Sdk` reference to `App` and instantiate instance of `NewsSearchApiClient`.

```bash
dotnet add ./src/App reference ./src/NewsSearch.Sdk/
```

```csharp
var requestAdapter = Mock<IRequestAdapter>;
var client = new NewsSearchApiClient(requestAdapter);
```

The request adapter interface `IRequestAdapter` is the primary point where **Kiota** service libraries will trigger the creation of a HTTP request. The default implementation in .NET has the name `HttpClientRequestAdapter` and it takes `IAuthenticationProvider` as a dependency.

Most REST APIs are protected through some kind of authentication and authorization scheme. The default HTTP core services provided by **Kiota** require an authentication provider to be passed to handle authentication concerns.

NewsSearch API has ApiKey Authentication. We can use standard class `Microsoft.Kiota.Abstractions.Authentication.ApiKeyAuthenticationProvider`

```csharp
ApiKeyAuthenticationProvider authenticationProvider = new (
    apiKey, "Ocp-Apim-Subscription-Key", KeyLocation.Header);

HttpClientRequestAdapter requestAdapter = new (authenticationProvider)
{
    BaseUrl = "https://api.bing.microsoft.com/v7.0"
};
```

Let's put everything together:

```csharp
app.MapGet(
    "trending/{country:minlength(2):maxlength(2)}",
    async (IConfiguration configuration, string? country) =>
{
    ApiKeyAuthenticationProvider authenticationProvider = new (
        configuration["ApiKey"], "Ocp-Apim-Subscription-Key", KeyLocation.Header);

    HttpClientRequestAdapter requestAdapter = new (authenticationProvider)
    {
        BaseUrl = "https://api.bing.microsoft.com/v7.0"
    };

    var client = new NewsSearchApiClient(requestAdapter);
    var response = await client
        .News
        .Trendingtopics.GetAsync(r => r.QueryParameters.Cc = country);

    return response;
});
```

Before we test it, we need to set ApiKey. Navigate to Azure portal and create resource of type `microsoft.bing/accounts` and copy ApiKey.

```bash
dotnet user-secrets --project ./src/App set ApiKey "<key>"
```

Finally, we are ready to Run our demo:

```bash
dotnet run --project ./src/App
curl -s http://localhost:5103/trending/US | jq '.value[].name' | head -3
```

![demo1](/assets/kiota/demo1.png)

The setup, as demonstrated, is quite straightforward. The hierarchical approach to the client builder is particularly commendable as it simplifies the discovery of REST APIs, making it intuitive and user-friendly.

### Automatic Generation

Since kiota ships as `dotnet global-tool` we can easily rely on it as dependency and therefore make it as part of build process. Here is how to build SDK client every time we build the project. This way we don't need to use **Kiota** CLI everytime.

Add this to `NewsSearch.Sdk.csproj`:

```xml
<Target Name="GenerateClient" AfterTargets="Build" Condition="$(Configuration)=='Debug'">
    <Exec Command="dotnet kiota generate -l CSharp --output ./ --namespace-name NewsSearch.Sdk --class-name NewsSearchApiClient --include-path **/trendingtopics --exclude-backward-compatible --openapi ./OpenApi/NewsSearch.json" WorkingDirectory="$(ProjectDir)" />
</Target>
```

## Conclusion

In conclusion, this blog post has provided a comprehensive introduction to **Kiota**, a powerful tool developed by Microsoft for generating API clients. We've learned how **Kiota** can simplify the process of interacting with multiple APIs by generating consistent, strongly typed API clients.

We've also explored **Kiota**'s key features, including its language-agnostic nature, minimal code generation, reduced external dependencies, and full access to HTTP capabilities.

The post has demonstrated how to install and use **Kiota**, and provided a detailed walkthrough of generating a client SDK based on an OpenAPI specification. We've seen how **Kiota** can enhance discoverability and how it can be integrated into an application to fetch trending topics from the Bing REST API.

Overall, **Kiota** is a promising tool that can significantly streamline the process of working with APIs, making it a valuable addition to any developer's toolkit.

## References

* <https://learn.microsoft.com/en-us/openapi/kiota/overview>
* <https://github.com/darrelmiller/KiotaApp>
* <https://github.com/NikiforovAll/kiota-getting-started>
