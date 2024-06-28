---
layout: post
title: "Managing Startup Dependencies in .NET Aspire"
categories: [ dotnet, aspire ]
tags: [ dotnet, aspnetcore, aspire ]
published: true
shortinfo: "This article demonstrates how to utilize .NET Aspire as an orchestrator. You will discover how effortless it is to define a dependency graph between components during startup."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

This article demonstrates how to utilize .NET Aspire as an orchestrator. You will discover how effortless it is to define a dependency graph between components during startup.

**Source code**: <https://github.com/NikiforovAll/aspire-depends-on>

**Example**: <https://github.com/NikiforovAll/aspire-depends-on/tree/main/samples/Todo>

*Table of Contents:*

- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Using docker-compose 🐳](#using-docker-compose-)
- [Why .NET Aspire? 🚀](#why-net-aspire-)
- [Using Aspire](#using-aspire)
  - [Writing Custom Health Checks for Aspire](#writing-custom-health-checks-for-aspire)
- [Conclusion](#conclusion)
- [References](#references)

<center>
    <img src="/assets/startup-dependencies-aspire/aspire-dependencies-banner.png" style="margin: 15px;" width="80%">
</center>

## Introduction

Managing startup dependencies is a common task for any kind of a project in modern days, especially in microservices solutions.

☝️ Here are a few reasons why it is important:

* **Order of Initialization**: Multiple services may need to be initialized and started in a specific order. For example, if Service A depends on Service B, Service B needs to be up and running before Service A can start. By managing startup dependencies, you ensure that services are initialized in the correct order, preventing potential issues and ensuring smooth operation and startup.

* **Graceful Startup and Shutdown**: Managing startup dependencies allows you to implement graceful startup and shutdown procedures. During startup, you can perform necessary initialization tasks, such as establishing database connections or loading configuration settings, before accepting incoming requests. Similarly, during shutdown, you can gracefully stop services, release resources, and perform any necessary cleanup operations.

* **Fault Tolerance and Resilience**: In a distributed environment, *failures are inevitable*. By managing startup dependencies, you can implement fault tolerance and resilience mechanisms. For example, you can configure services to retry connecting to dependent services if they are temporarily unavailable. This helps ensure that your application can recover from failures and continue functioning properly.

To manage startup dependencies effectively, you can use various techniques and tools.Orchestrators can help automate the process of managing dependencies and ensure that services are started in the correct order.

## Using docker-compose 🐳

One common approach is by using `docker-compose`.It provides a declarative way to define the dependencies between components and ensure they are started in the correct order.

To illustrate , let's assume that the `api` service represents a todo application that relies on a `postgres` database. Before the `api` service can start accepting requests, it needs to ensure that the necessary database migration (`migrator`) and seeding operations have been completed.

<center>
    <div class="mermaid">
    graph TD;
        postgres --> pgAdmin;
        postgres --> migrator;
        migrator --> api;
    </div>
</center>

Once the migration is successfully completed, the `api` service can start and begin serving requests. This approach allows for a controlled and orderly startup process, ensuring that all dependencies are satisfied before the `api` service becomes available.

```yml
version: '3.8'
services:
    postgres:
        image: postgres:latest
    depends_on:
        - migrator
    pgadmin:
        image: dpage/pgadmin4:latest
    migrator:
        image: migrate/migrate:latest
        depends_on:
            - postgres
```

This `docker-compose.yml` file defines the services `postgres`, `pgadmin`, and `migrator`. The `postgres` service is the database, the `pgadmin` service is a web-based administration tool, and the `migrator` service is responsible for performing the database migration.

By specifying the dependencies using the `depends_on` keyword, the `migrator` service will wait for the `postgres` service to be up and running before executing the migration. Once the migration is completed, the `api` service can safely start and interact with the database.

```yml
version: '3.8'
services:
  postgres:
    image: postgres:latest
  depends_on:
    - migrator

  pgadmin:
    image: dpage/pgadmin4:latest

  migrator:
    image: migrate/migrate:latest
    depends_on:
      - postgres
```

🤔💭 But, wait, is it that easy? Why do we need to using something else than?

Well... In practice, relying solely on the **depends_on** directive in a Docker Compose file may not be sufficient to ensure that a component has fully started up and is ready to accept connections or perform its intended tasks. While **depends_on** helps manage the startup order of services, it *does not guarantee that a service is fully operational* before another service starts.

To address this, it is common to write custom bash scripts or use other tools to perform health checks on the dependent services. These health checks can verify that the service is in a desired state before proceeding with the startup of other components.

A health check typically involves making requests to the dependent service and checking for specific responses or conditions that indicate it is ready. For example, you might check if a database service is accepting connections by attempting to connect to it and verifying that it responds with a successful connection status.

It's important to note that the specific implementation of health checks and custom scripts may vary depending on the technology stack and tools you are using.

## Why .NET Aspire? 🚀

While managing startup dependencies using YAML, Dockerfile, and Bash scripts can be challenging, .NET Aspire offers a better way to handle these dependencies directly in C#.

With .NET Aspire, you can define a dependency graph between components during startup using C# code. This allows for a more intuitive and seamless integration with your .NET projects. You can easily specify the order of initialization, implement graceful startup and shutdown procedures, and ensure fault tolerance and resilience.

By leveraging the power of C#, you have access to the rich ecosystem of .NET libraries and frameworks, making it easier to handle complex startup scenarios. You can use the built-in dependency injection capabilities of .NET to manage and resolve dependencies, ensuring that services are initialized in the correct order.

Overall, .NET Aspire offers a more developer-friendly approach to managing startup dependencies in .NET projects, making it a compelling choice for simplifying your application's startup.

## Using Aspire

I've prepared Nuget package called [Nall.Aspire.Hosting.DependsOn](https://www.nuget.org/packages/Nall.Aspire.Hosting.DependsOn) to simplify the process of defining dependencies between components.

Let's see how to use it to describe dependencies for the Todo application described above.

Here is our starting point, **without dependencies**:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var dbServer = builder
    .AddPostgres("db-server");

dbServer.WithPgAdmin(c => c.WithHostPort(5050));

var db = dbServer.AddDatabase("db");

var migrator = builder
    .AddProject<Projects.MigrationService>("migrator")
    .WithReference(db);

var api = builder
    .AddProject<Projects.Api>("api")
    .WithReference(db);

builder.Build().Run();
```

---

💡 I strongly recommend you checking out source code for more details, it is a fully-functional application. All you need to do - is to run it by hitting `F5` - <https://github.com/NikiforovAll/aspire-depends-on/tree/main/samples/Todo>

---

Now, let's install required packages. `Nall.Aspire.Hosting.DependsOn` defines a `WaitFor` and `WaitForCompletion` methods used to determine startup ordering.

Install core package 📦:

```bash
dotnet add package Nall.Aspire.Hosting.DependsOn
```

Also, we need to install specific packages for the dependencies. In our case, it is a PostgreSQL database. 

Install health-check-specific package 📦:

```bash
dotnet add package Nall.Aspire.Hosting.DependsOn.PostgreSQL
```

Specific health checks packages define `WithHealthCheck` extension methods. These methods are technology specific, but in essence are easy to understand and could be written on demand for any kind of dependency without using `Nall.Aspire.Hosting.DependsOn`. Later, I will show you how to write your own `WithHealthCheck` method.

Let's put everything together:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var dbServer = builder
    .AddPostgres("db-server")
    .WithHealthCheck(); // <-- define health check

dbServer.WithPgAdmin(c => c.WithHostPort(5050)
    .WaitFor(dbServer)); // <-- wait for db

var db = dbServer.AddDatabase("db");

var migrator = builder
    .AddProject<Projects.MigrationService>("migrator")
    .WithReference(db)
    .WaitFor(db); // <-- wait for db

var api = builder
    .AddProject<Projects.Api>("api")
    .WithReference(db)
    .WaitForCompletion(migrator); // <-- wait until process is terminated

builder.Build().Run();
```

### Writing Custom Health Checks for Aspire

By convention, `WithHealthCheck` method should define `HealthCheckAnnotation` annotation for Aspire resource.

```csharp
public class HealthCheckAnnotation(
    Func<IResource, CancellationToken, Task<IHealthCheck?>> healthCheckFactory
) : IResourceAnnotation
```

Let's see the implementation of `Nall.Aspire.Hosting.DependsOn.Uris`, the package that allows to wait for resources that expose a health check endpoint, usually it is `/health` endpoint that returns "200 OK" status code if everything is fine.

Here is `WithHealthCheck` method signature:

```csharp
public static IResourceBuilder<T> WithHealthCheck<T>(
    this IResourceBuilder<T> builder,
    string? endpointName = null,
    string path = "health"
) where T : IResourceWithEndpoints
```

Note, usually, you don't really need to implement health checking logic, [AspNetCore.HealthChecks.*](https://www.nuget.org/packages?q=AspNetCore.HealthChecks) has something to offer.

In case of `Nall.Aspire.Hosting.DependsOn.Uris`, it depends on `AspNetCore.HealthChecks.Uris`.

So the implementation is straight forward, just find a endpoint by name and define health check for a given path:

```csharp
public static IResourceBuilder<T> WithHealthCheck<T>(
    this IResourceBuilder<T> builder,
    string? endpointName = null,
    string path = "health"
)
    where T : IResourceWithEndpoints
{
    return builder.WithAnnotation(new HealthCheckAnnotation(
        async (resource, ct) =>
        {
            if (resource is not IResourceWithEndpoints resourceWithEndpoints)
            {
                return null;
            }

            var endpoint = endpointName is null
                ? resourceWithEndpoints
                    .GetEndpoints()
                    .FirstOrDefault(e => e.Scheme is "http" or "https")
                : resourceWithEndpoints.GetEndpoint(endpointName);

            var url = endpoint?.Url;

            var options = new UriHealthCheckOptions();
            options.AddUri(new(new(url), path));

            var client = new HttpClient();

            return new UriHealthCheck(options, () => client);
        }
    ));
}
```

## Conclusion

In this article, we explored the challenges of managing startup dependencies in modern applications, particularly in the context of microservices architectures.

.NET Aspire elevates the management of startup dependencies. By allowing developers to define dependency graphs in C#.

Through practical examples, we demonstrated how to use .NET Aspire and its extensions to manage dependencies in a more intuitive and reliable manner. We also touched on the creation of custom health checks, showcasing the flexibility and extensibility of .NET Aspire.

🙌 In conclusion, managing startup dependencies has never been easier with .NET Aspire, and I believe every project needs it.

## References

* <https://github.com/NikiforovAll/aspire-depends-on>
