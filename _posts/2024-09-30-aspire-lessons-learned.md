---
layout: post
title: "10 Lessons I Learned from Using Aspire in Production"
categories: [ dotnet, aspire ]
tags: [ dotnet, aspire ]
published: true
shortinfo: "A collection of lessons learned from using .NET Aspire in production."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

I have been using .NET Aspire for a while now and have learned a lot along the way. In this blog post, I will share some of the lessons I have learned from using .NET Aspire in production.

> .NET Aspire version: **8.2.1**

<center>
  <img src="/assets/aspire-lessons-learned/aspire-brand.png" style="margin: 15px;" width="40%">
</center>

- [TL;DR](#tldr)
- [Case Study](#case-study)
- [Lesson 1. Adding Aspire is quite straightforward and incremental](#lesson-1-adding-aspire-is-quite-straightforward-and-incremental)
- [Lesson 2. Be ready to write custom integrations](#lesson-2-be-ready-to-write-custom-integrations)
- [Lesson 3. Aspire workload should be installed every time you run the CI/CD pipeline](#lesson-3-aspire-workload-should-be-installed-every-time-you-run-the-cicd-pipeline)
- [Lesson 4. Managing Startup Dependencies is a must have](#lesson-4-managing-startup-dependencies-is-a-must-have)
- [Lesson 5. Aspire project can take some time to boot up](#lesson-5-aspire-project-can-take-some-time-to-boot-up)
- [Lesson 6. It can be challenging to run things without Aspire](#lesson-6-it-can-be-challenging-to-run-things-without-aspire)
- [Lesson 7. There is no easy way to run a partial setup](#lesson-7-there-is-no-easy-way-to-run-a-partial-setup)
- [Lesson 8. Using Podman instead of Docker can be troublesome](#lesson-8-using-podman-instead-of-docker-can-be-troublesome)
- [Lesson 9. Aspire client integrations requires IHostApplicationBuilder](#lesson-9-aspire-client-integrations-requires-ihostapplicationbuilder)
- [Lesson 10. Learn by example](#lesson-10-learn-by-example)
- [Conclusion](#conclusion)

## Case Study

Assume we have a project, it is a **web application** with advanced enterprise search capabilities, utilizing `Elasticsearch` for data querying. It features a **background jobs** for scraping and processing data from various sources, storing structured data in `PostgreSQL` and files in `Azure Blob Storage`. Additionally, we have a **CLI** tool for essential administrative tasks such as reindexing and database migrations, ensuring system maintenance and automation.

<center>
<div class="mermaid">
graph LR;
    subgraph BS [Backing Services]
        B[Elasticsearch]
        C[PostgreSQL]
        D[Azure Blob Storage]
    end
    A[Web App] --> B[Elasticsearch]
    E[Jobs] --> B
    E --> C[PostgreSQL]
    E --> D[Blob Storage]
    F[CLI] --> B
    F --> C
    F --> D
</div>
</center>

---

🎯 Our objective was to improve the developer experience by integrating **.NET Aspire**. We aimed to create a seamless so called *F5* setup for every team member.

💡 An "F5 setup" refers to a development environment configuration where a developer can simply press the F5 key (commonly used to start debugging in many IDEs, including Visual Studio) to run the application. This setup aims to streamline the development process by ensuring that all necessary services, dependencies, and configurations are automatically handled, allowing developers to focus on coding without worrying about manual setup or configuration.

- For existing developers, this means more efficient development and debugging workflows.
- For new developers, this means they can start working on the project without the hassle of manually configuring and setting up the underlying infrastructure. This approach ensures a smoother onboarding process and a more efficient development workflow.

Furthermore, `AppHost` serves as a composition root of the solution. If done correctly, you can reason what this solution is about just by looking at it.

---

🚀 Down below, I will share some of the lessons learned from this experience. Let's dive in!

## Lesson 1. Adding Aspire is quite straightforward and incremental

It turns out that transitioning your entire project to Aspire doesn't have to be an all-or-nothing endeavor. You can begin by adding the `AppHost` and progressively migrate your backing services at your own pace.

For example, if you already have `Elasticsearch` configured in a non-Aspire way, you don't have to use the official Aspire `Elasticsearch` **client** integration. You can just use the **hosting** integration and write adapter code to bridge the gap between Aspire and your existing code. My suggestion is to make these changes to `AppHost` to limit the amount of changes and avoid altering existing working code.

💡 Additionally, we didn't really want to change the way we configure and manage cross-cutting concerns, so we abandoned the idea of using `ServiceDefaults` altogether.We simply added an OpenTelemetry integration to enable logs, traces, and metrics in the Aspire Dashboard.

🗒️ References:

- [Tutorial: Add .NET Aspire to an existing .NET app](https://learn.microsoft.com/en-us/dotnet/aspire/get-started/add-aspire-existing-app?tabs=unix&pivots=dotnet-cli)

## Lesson 2. Be ready to write custom integrations

We adopted Aspire at an early stage, and during our migration to Aspire, there was no official integration for `Elasticsearch`. Consequently, we developed a custom integration to configure `Elasticsearch` with Aspire by creating a custom `ElasticsearchResource`.

Custom hosting integrations often depend on an existing Dockerfile or Docker image. Therefore, creating one involves using `IDistributedApplicationBuilder` to define the Docker equivalents.

```csharp
public static IResourceBuilder<ElasticsearchResource> AddElasticsearch(
    this IDistributedApplicationBuilder builder,
    string name,
    IResourceBuilder<ParameterResource>? password = null,
    int? port = null,
    int? internalPort = null
)
{
    ArgumentNullException.ThrowIfNull(builder);

    var passwordParameter =
        password?.Resource
        ?? ParameterResourceBuilderExtensions.CreateDefaultPasswordParameter(
            builder,
            $"{name}-password"
        );

    var elasticsearch = new ElasticsearchResource(name, passwordParameter);

    return builder
        .AddResource(elasticsearch)
        .WithImage(ElasticsearchContainerImageTags.Image, ElasticsearchContainerImageTags.Tag)
        .WithImageRegistry(ElasticsearchContainerImageTags.Registry)
        .WithHttpEndpoint(
            targetPort: ElasticsearchPort,
            port: port,
            name: ElasticsearchResource.PrimaryEndpointName
        )
        .WithEndpoint(
            targetPort: ElasticsearchInternalPort,
            port: internalPort,
            name: ElasticsearchResource.InternalEndpointName
        )
        .WithEnvironment("discovery.type", "single-node")
        .WithEnvironment("xpack.security.http.ssl.enabled", "false")
        .WithEnvironment("xpack.security.enabled", "true")
        .WithEnvironment("ELASTIC_PASSWORD", elasticsearch.PasswordParameter);
}
```

As you can see above, we created a custom `AddElasticsearch` extension method to configure `Elasticsearch` with Aspire. This method adds an `ElasticsearchResource` to the `IDistributedApplicationBuilder` and configures the necessary settings for the `Elasticsearch` Docker container.

It is a good idea to put separate custom integrations in a separate project to keep the codebase clean and organized. This approach also makes it easier to manage and maintain custom integrations as your project grows.

💡To gracefully migrate to Aspire and limit the amount of changes, we employed a previously mentioned technique (Lesson 1). I call this approach **hosting integration adapter method**.

You can provide an overload of `WithReference` to configure a custom integration in an opinionated way.

For example, here is how to provide a connection string and environment variables simultaneously:

```csharp
public static IResourceBuilder<TDestination> WithReference<TDestination>(
    this IResourceBuilder<TDestination> builder,
    IResourceBuilder<ElasticsearchResource> source
)
    where TDestination : IResourceWithEnvironment
{
    ArgumentNullException.ThrowIfNull(source);
    
    var resource = source.Resource;
    const string Prefix = "Elastic";

    // Add connection string as is (Aspire-way)
    IResourceBuilder<IResourceWithConnectionString> connectionSTringResource = source;
    builder.WithReference(connectionSTringResource);

    // Adapter code (Custom-way)
    builder.WithEnvironment($"{Prefix}__Url", resource.PrimaryEndpoint);
    builder.WithEnvironment($"{Prefix}__Login", ElasticsearchResource.UserName);
    builder.WithEnvironment($"{Prefix}__Password", resource.PasswordParameter.Value);

    return builder;
}
```

The benefit of this approach is that you can just conform to an existing way you configure your services and minimize the changes.

💡 Often, managing backing services requires additional tools such as **pgAdmin** for PostgreSQL, **Kibana** for Elasticsearch, or **Azure Storage Explorer** for Azure Blob Storage. A growing *pattern* is to add tooling support for hosting integrations using `With{ToolName}`. Here is an example:

```csharp
public static IResourceBuilder<T> WithKibana<T>(
    this IResourceBuilder<T> builder,
    Action<IResourceBuilder<KibanaContainerResource>>? configureContainer = null,
    string? containerName = null
)
    where T : ElasticsearchResource
{
  // implementation goes here
}
```

This approach works well because it is easier to encapsulate two Aspire resources and use them together since their lifecycles are the same. I call this approach **hosting integration tool**.

References:

- [.NET Aspire integrations overview](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/integrations-overview)

## Lesson 3. Aspire workload should be installed every time you run the CI/CD pipeline

Installing the Aspire workload is necessary for it to function, but this can be cumbersome, especially in a CI/CD pipeline. The workload must be installed every time the pipeline runs, which can be time-consuming and tedious.

To address this, we created a separate solution for Aspire AppHost and its dependencies, excluding it from the main solution. This effectively removes the Aspire component from the CI/CD pipeline.

🙌🆕 Luckily, you don't have to do it in Aspire 9.0. A standalone MSBuild SDK - `Aspire.AppHost.Sdk` should be referenced from the `AppHost` project.

See the related GitHub issue: [Remove Aspire.Hosting.SDK from the Workload #5444](https://github.com/dotnet/aspire/issues/5444)

## Lesson 4. Managing Startup Dependencies is a must have

In real-world applications, managing startup dependencies is crucial. For instance, you may need to ensure that a database is up and running before starting a migration CLI tool. Once the migration is complete, you might need to start the web application.

Although Aspire does not support this out of the box, you can achieve it using Aspire's extension points.

For a detailed guide, refer to my blog post [Managing Startup Dependencies in .NET Aspire](https://nikiforovall.github.io/dotnet/aspire/2024/06/28/startup-dependencies-aspire.html). Basically, I have created a NuGet package [Nall.Aspire.Hosting.DependsOn](https://www.nuget.org/packages/Nall.Aspire.Hosting.DependsOn) to address this issue.

Here is an example of how you can use it:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var dbServer = builder
    .AddPostgres("db-server")
    .WithHealthCheck();

dbServer.WithPgAdmin(c => c.WithHostPort(5050).WaitFor(dbServer));

var db = dbServer.AddDatabase("db");

var migrator = builder.AddProject<Projects.MigrationService>("migrator")
    .WithReference(db)
    .WaitFor(db);

var api = builder.AddProject<Projects.Api>("api")
    .WithReference(db)
    .WaitForCompletion(migrator);

builder.Build().Run();
```

In the code above, we use `WithHealthCheck`, `WaitFor`, `WaitForCompletion` to define dependency graph. This ensures that the database is up and running before starting the migration service, and the migration service is completed before starting the API.

🙌🆕 I have another good news for you! In Aspire 9.0, this is now a built-in feature.

See the related GitHub issue: [WaitFor/WaitForCompletion implementation. #5394](https://github.com/dotnet/aspire/pull/5394)

## Lesson 5. Aspire project can take some time to boot up

Since there is no hot-reload support for `AppHost`, you have to rebuild and restart the project every time you make a change. This can be time-consuming, especially if your project is large and has many dependencies.

In our case, the `Elasticsearch` container took some time to start up, which slowed down the development process. It can take 30-60 seconds to start up, which at first glance seems like not a lot, but trust me, things add up.

To overcome this, we've implemented a mechanism to run only infrastructure services when needed. It is like a `docker-compose.infrastructure.yml` file, but for Aspire.

🙌🆕 There is a solution to this problem! One of my favorite improvements in Aspire 9.0 is the - [option to set up and keep resources (containers) after AppHost shutdown #923](https://github.com/dotnet/aspire/issues/923). It saves us from the headache of restarting `Elasticsearch` every time we make a change.

## Lesson 6. It can be challenging to run things without Aspire

Sometimes you need to run things without Aspire, but it is not easy because everything is tightly integrated with Aspire, and a lot of things are abstracted away.
For example, assume I want to run a Blazor application in hot-reload mode without starting the Aspire `AppHost` but still utilize the infrastructure provisioned and managed by Aspire.

To overcome this, we created a specific project called `EnvDumper` that dumps the environment variables and connection strings to a file called `appsettings.Development.Aspire.json`. The idea is that you can run the application without Aspire by using this file.

So the scenario is like this:

1. You exclude a project from the Aspire `AppHost` by using configuration.
2. When you do this, the excluded projects are replaced by the `EnvDumper` project.
3. The `EnvDumper` project dumps the environment variables and connection strings to a file.
4. You add the corresponding file to an excluded project and run it without Aspire in hot-reload mode.

From `AppHost` perspective it looks like this:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

builder.RegisterProject<Projects.WebApp>("web-app")
    .WithReference(db)
    .WithReference(blobStorage)
    .WithReference(elastic);
```

Here is `RegisterProject` extension method:

```csharp
public static IResourceBuilder<IResourceWithEnvironment> RegisterProject<TProject>(
    this IDistributedApplicationBuilder builder,
    string name
)
    where TProject : IProjectMetadata, new()
{
    IResourceBuilder<IResourceWithEnvironment>? project = 
        IsExcludedProject(builder, name)
        ? builder.AddProject<Projects.EnvDumper>(componentName)
        : builder.AddProject<TProject>(name);

    return project;
}
```

🙌🆕 Alternatively, to speed up the development process, consider exploring the new feature in Aspire 9.0 - [Add support for restarting services from the dashboard #295](https://github.com/dotnet/aspire/issues/295). Although I haven't tried it yet, I believe this feature will address many of my requirements.

## Lesson 7. There is no easy way to run a partial setup

Sometimes you need to run a partial setup, for example, to test a specific feature or component without starting the entire application. However, Aspire does not provide an easy way to do this out of the box. As you already know, we added the feature to exclude projects from the Aspire `AppHost` by using configuration. (See Lesson 5)

## Lesson 8. Using Podman instead of Docker can be troublesome

💥 Networking issues can arise when using Podman instead of Docker from Windows. For example, we encountered problems with the Kibana container not being able to connect to the Elasticsearch container.

The problem exists to this day, and there are no workarounds available.

See the related GitHub issue: [Podman-hosted containers may not be able to reach Aspire services #4136](https://github.com/dotnet/aspire/issues/4136)

## Lesson 9. Aspire client integrations requires IHostApplicationBuilder

Aspire client integrations require `IHostApplicationBuilder`, which might not always be available. For instance, if you want to use client integrations and add dependencies to `IServiceCollection` in a console application, or if you have existing code that uses `IServiceCollection` and `ConfigurationManager` separately, you may find out your self in a tricky situation. Now, you have to refactor entire codebase just to use a client integration.

This is what happened to us, take a look at:

```csharp
public static void AddNpgsqlDataSource(
    this IHostApplicationBuilder builder,
    string connectionName,
    Action<NpgsqlSettings>? configureSettings = null,
    Action<NpgsqlDataSourceBuilder>? configureDataSourceBuilder = null);
```

As you can see, we should provide an instance of `IHostApplicationBuilder` to use this extension method. This was a problem in our case because we had a lot of existing code that uses `IServiceCollection`, and since our solution consists of a hierarchy of projects with different configurations, it takes some time to refactor everything.

🤔 I think this design choice breaks the Postel's Law principle, which states that you should be liberal in what you accept and conservative in what you send. In other words, it should be easy to use and hard to misuse. I would imagine an overload that does less but requires `IServiceCollection` instead. It would make client integrations more composable.

## Lesson 10. Learn by example

The best way to learn how to use Aspire is by example. I recommend checking out the official Aspire samples and the Aspire GitHub repository.

⭐ Here are some of my favorite reference applications:

- [eShopSupport](https://github.com/dotnet/eShopSupport) - A reference .NET application using AI for a customer support ticketing system
- [eShop](https://github.com/dotnet/eShop) - A reference .NET application implementing an eCommerce site
- [eShopOnAzure](https://github.com/Azure-Samples/eShopOnAzure) - A variant of eShop that uses Azure services
- [cecilphillip/shadowShop](https://github.com/cecilphillip/shadowshop) - A modified version of the Aspire Shop sample application that adds integration with Stripe for payment processing, temporal for durable workflows, other customer Aspire Integrations
- [thangchung/practical-dotnet-aspire](https://github.com/thangchung/practical-dotnet-aspire) - The practical .NET Aspire builds on the coffeeshop app business domain
- [Aspirant](https://github.com/aspirant-project/aspirant) - Aspirant is a set of extensions and experiments for .NET Aspire App Host projects

## Conclusion

Aspire is more than just an alternative to docker-compose; it is a comprehensive ecosystem designed to simplify the building, running, and management of your applications. The key feature of Aspire is its **programmability**, which enables you to extend and customize the platform to meet your specific requirements.

> 🙌 I hope you found it helpful. If you have any questions, please feel free to reach out. If you'd like to support my work, a star on GitHub would be greatly appreciated! 🙏
