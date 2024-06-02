---
layout: post
title: "Using Keycloak in .NET Aspire projects"
categories: [ dotnet, keycloak ]
tags: [ dotnet, aspnetcore, keycloak, aspire ]
published: true
shortinfo: "Learn how to run Keycloak installation via Aspire"
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

You can use [Keycloak.AuthServices.Templates](https://www.nuget.org/packages/Keycloak.AuthServices.Templates/) to add Keycloak support for .NET Aspire projects. See the docs for more details - [Keycloak.AuthServices/Aspire Support](https://nikiforovall.github.io/keycloak-authorization-services-dotnet/devex/aspire.html).

Source code: <https://github.com/NikiforovAll/keycloak-aspire-starter-template>

- [TL;DR](#tldr)
- [Introduction](#introduction)
  - [Scaffold a solution](#scaffold-a-solution)
  - [Run it](#run-it)
- [Code Explained](#code-explained)
- [Conclusion](#conclusion)
- [References](#references)

## Introduction

From the official [docs](https://learn.microsoft.com/en-us/dotnet/aspire/get-started/aspire-overview):

> .NET Aspire is designed to improve the experience of building .NET cloud-native apps. It provides a consistent, opinionated set of tools and patterns that help you build and run distributed apps.

Personally, I'm a big fan of Aspire because it enables great developer experience and productivity. I recommend trying it on your own 🚀

This article will show you how to get started with Keycloak and Aspire. It is based on [Keycloak.AuthServices.Templates](https://www.nuget.org/packages/Keycloak.AuthServices.Templates) template. Templates make it really easy to get started. 

💡Here is a basic example of how the integration looks like:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var keycloak = builder
    .AddKeycloakContainer("keycloak")
    .WithDataVolume();

var realm = keycloak.AddRealm("Test");

builder.AddProject<Projects.Api>("api")
    .WithReference(realm);

builder.Build().Run();
```

### Scaffold a solution

Install a templates pack:

```bash
❯ dotnet new install Keycloak.AuthServices.Templates
# The following template packages will be installed:
#    Keycloak.AuthServices.Templates::2.5.0
# Success: Keycloak.AuthServices.Templates::2.5.0 installed the following templates:
# Template Name            Short Name               Language  Tags
# -----------------------  -----------------------  --------  -------------------------------------
# Keycloak Aspire Starter  keycloak-aspire-starter  [C#]      Common/.NET Aspire/Cloud/API/Keycloak
# Keycloak WebApi          keycloak-webapi          [C#]      Common/API/Keycloak
```

```bash
❯ dotnet new keycloak-aspire-starter -o $dev/keycloak-aspire-starter-template
# The template "Keycloak Aspire Starter" was created successfully.
```

Here is what was generated:

```bash
❯ tre
.
├── .gitignore
├── Api
│   ├── Api.csproj
│   ├── Extensions.OpenApi.cs
│   ├── Program.cs
│   ├── Properties
│   │   └── launchSettings.json
│   ├── appsettings.Development.json
│   └── appsettings.json
├── AppHost
│   ├── AppHost.csproj
│   ├── KeycloakConfiguration
│   │   ├── Test-realm.json
│   │   └── Test-users-0.json
│   ├── Program.cs
│   ├── Properties
│   │   └── launchSettings.json
│   ├── appsettings.Development.json
│   └── appsettings.json
├── Directory.Build.props
├── Directory.Packages.props
├── README.md
├── ServiceDefaults
│   ├── Extensions.cs
│   └── ServiceDefaults.csproj
├── global.json
└── keycloak-aspire-starter-template.sln
```

### Run it

```bash
❯ dotnet run --project ./AppHost/
# Building...
# info: Aspire.Hosting.DistributedApplication[0]
#       Aspire version: 8.0.1+a6e341ebbf956bbcec0dda304109815fcbae70c9
# info: Aspire.Hosting.DistributedApplication[0]
#       Distributed application starting.
# info: Aspire.Hosting.DistributedApplication[0]
#       Application host directory is: C:\Users\Oleksii_Nikiforov\dev\keycloak-aspire-starter-template\AppHost
# info: Aspire.Hosting.DistributedApplication[0]
#       Now listening on: http://localhost:15056
# info: Aspire.Hosting.DistributedApplication[0]
#       Distributed application started. Press Ctrl+C to shut down.
```

Here are resources from Aspire Dashboard:

<center>
    <img src="/assets/keycloak-aspire/dashboard-resources.png" style="margin: 15px;">
</center>

As you can see, there is a `quay.io/keycloak/keycloak:24.0.3` container running. It is available on your local machine: <http://localhost:8080/>. Use `admin:admin` credentials.

The template project was generated with exemplary import files. It imports *Test* realm, adds *workspaces-client*, and seeds test users:

<center>
    <img src="/assets/keycloak-aspire/test-realm.png" style="margin: 15px;">
</center>

Now, we can open Swagger UI and retrieve an access token. Note, imported realm is configured to support [Implicit Flow](https://oauth.net/2/grant-types/implicit/). We can use it during the development process as demonstrated below.

<center>
    <img src="/assets/keycloak-aspire/auth-swagger-ui.png" width="100%" style="margin: 15px;">
</center>

To invoke the API you can use Swagger UI or other HTTP tool of your choice. Here is an example of how to use `cURL`:

```bash
curl -X 'GET' \
  'https://localhost:51492/hello' \
  -H 'accept: text/plain' \
  -H 'Authorization: Bearer <AUTH_TOKEN>'

# Hello World!
```

## Code Explained

Basically, to setup Keycloak installation with Aspire we need to setup two things:

1. Add Keycloak Resource to Aspire `AppHost`.
2. Configure Web API to target Keycloak installation

Here is how to add Keycloak as resource to Aspire:

```csharp
// AppHost/Program.cs
var builder = DistributedApplication.CreateBuilder(args);

var keycloak = builder
    .AddKeycloakContainer("keycloak")
    .WithDataVolume()
    .WithImport("./KeycloakConfiguration/Test-realm.json")
    .WithImport("./KeycloakConfiguration/Test-users-0.json");

var realm = keycloak.AddRealm("Test");

builder.AddProject<Projects.Api>("api").WithReference(keycloak).WithReference(realm);

builder.Build().Run();
```

The code above does the following:

1. Starts a Keycloak Instance
2. Imports realm and test users
3. Reference to Keycloak adds Keycloak to service discovery
4. Reference to Realm adds *Keycloak__Realm* and *Keycloak__AuthServerUrl* environment variables.

And here is how to configure `Api` to integrated with Keycloak and use *workspaces-client*:

```csharp
// Api/Program.cs
using Api;
using Keycloak.AuthServices.Authentication;

var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;
var configuration = builder.Configuration;

builder.AddServiceDefaults();
services.AddApplicationOpenApi(configuration);

services.AddKeycloakWebApiAuthentication(
    configuration,
    options =>
    {
        options.Audience = "workspaces-client";
        options.RequireHttpsMetadata = false;
    }
);
services.AddAuthorization();

var app = builder.Build();

app.UseHttpsRedirection();

app.UseApplicationOpenApi();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/hello", () => "Hello World!").RequireAuthorization();

app.Run();
```

## Conclusion

The integration of Keycloak with .NET Aspire projects provides a first class support for building distributed, cloud native systems. By leveraging the `Keycloak.AuthServices.Templates` template, developers can easily scaffold a solution and configure their APIs to work with Keycloak.

---

🙌 `Keycloak.AuthServices.Templates` is under development. Please, feel free to submit PRs. [![contributionswelcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/nikiforovall/keycloak-authorization-services-dotnet) 🙌

## References

* <https://github.com/NikiforovAll/keycloak-authorization-services-dotnet>
* <https://nikiforovall.github.io/keycloak-authorization-services-dotnet/devex/aspire.html>
* <https://learn.microsoft.com/en-us/dotnet/aspire/>