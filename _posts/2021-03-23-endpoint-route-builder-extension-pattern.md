---
layout: post
title: ASP.NET Core Endpoints. Add endpoint-enabled middleware by using IEndpointRouteBuilder extension method
categories: [ dotnet, aspnetcore ]
tags: [ dotnet, aspnetcore, aspnetcore-pipeline ]
published: true
shortinfo: An example of how to add middleware for a selected endpoint. EndpointRouteBuilderExtensions pattern.
fullview: false
comments: true
hide-related: true
link-list: 
---

## TL;DR

You can use extension method (e.g. `IEndpointConventionBuilder Map{FeatureToMap}(this IEndpointRouteBuilder endpoints`) to add a middleware to specific endpoint.

---

## Middleware

Middleware forms the basic building blocks of the HTTP Pipeline. It is a really good concept to implement cross-cutting concerns and weave re-usable piece of code to the ASP.NET pipeline.Middleware provides application level features. For example, you might need Middleware to implement features like: *Routing*, *Cookies*, *Session*, *CORS*, *Authentication*, *HTTPS Redirection*, *Caching*, *Response Compression*, *Exception Handling*. Most of the time, you've got [out-of-the-box](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/middleware/#built-in-middleware) option provided by framework.

To extend ASP.NET Core pipeline we use [IApplicationBuilder](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/middleware/?#create-a-middleware-pipeline-with-iapplicationbuilder) injected in `Startup.cs`.

Furthermore, since ASP.NET Core 3.0 you could use [HttpContext.GetEndpoint](https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.http.endpointhttpcontextextensions.getendpoint) to retrieve selected endpoint/metadata, e.g.:

```csharp
// Before routing runs, endpoint is always null here
app.Use(next => context =>
{
    Console.WriteLine($"Endpoint: {context.GetEndpoint()?.DisplayName ?? "(null)"}");
    return next(context);
});

app.UseRouting();

// After routing runs, endpoint will be non-null if routing found a match
app.Use(next => context =>
{
    Console.WriteLine($"Endpoint: {context.GetEndpoint()?.DisplayName ?? "(null)"}");
    return next(context);
});
```

Middleware can exist as simple inline methods or as complex, reusable classes. If you don't like `RequestDelegate` notation/form. You can use [IApplicationBuilder.UseMiddleware](https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.builder.usemiddlewareextensions.usemiddleware) extension method to add middleware as a class and access an endpoint from parameter (`HttpContext`).

```csharp
// Startup.cs
app.UseMiddleware<MyAwesomeMiddleware>();
// ...
// MyAwesomeMiddleware.cs
public async Task InvokeAsync(HttpContext httpContext)
{
    var endpoint = httpContext.GetEndpoint();
}
```

If you need something more fine-grained and, probably, more powerful you can use `Endpoint` concept.

## Routing and Endpoints

Routing is responsible for matching incoming HTTP requests and dispatching those requests to the app's executable endpoints. You can use `IApplicationBuilder.UseEndpoints` to define pipeline logic based on a selected route. Many of ASP.NET Core features/aspects are implemented with the routing concept in mind. For example, you can [IEndpointRouteBuilder.MapControllers](https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.builder.controllerendpointroutebuilderextensions.mapcontrollers) or [IEndpointRouteBuilder.MapGrpcService](https://docs.microsoft.com/en-us/aspnet/core/grpc/aspnetcore?view=aspnetcore-5.0) or you can build your own framework based on this extension capabilities.

```csharp
app.UseEndpoints(endpoints =>
{
    // Configure another endpoint, with authorization.
    endpoints.MapGet("/", async context =>
    {
        await context.Response.WriteAsync($"Hello from {context.GetEndpoint()}!");
    }).RequireAuthorization().WithMetadata(new AuditPolicyAttribute(needsAudit: true));
});
```

As you can see, `Endpoint` contains a `EndpointMetadataCollection` that holds various data put and managed during pipeline execution.

```csharp
/// <summary>
/// Represents a logical endpoint in an application.
/// </summary>
public class Endpoint
{
    public Endpoint(
        RequestDelegate? requestDelegate,
        EndpointMetadataCollection? metadata,
        string? displayName)
    {
        RequestDelegate = requestDelegate;
        Metadata = metadata ?? EndpointMetadataCollection.Empty;
        DisplayName = displayName;
    }
    /// <summary>
    /// Gets the informational display name of this endpoint.
    /// </summary>
    public string? DisplayName { get; }
    /// <summary>
    /// Gets the collection of metadata associated with this endpoint.
    /// </summary>
    public EndpointMetadataCollection Metadata { get; }
    /// <summary>
    /// Gets the delegate used to process requests for the endpoint.
    /// </summary>
    public RequestDelegate? RequestDelegate { get; }
}
```

The big picture:

![aspnet-core-pipeline](/assets/endpoint-route/aspnet-core-pipeline.png)

## Practical Example

Recently, I've stumbled upon [IConfigurationRoot.GetDebugView](https://docs.microsoft.com/en-us/dotnet/api/microsoft.extensions.configuration.configurationrootextensions.getdebugview). Basically, it allows you to dump configuration values and reason about how configuration settings are resolved. Personally, I find this a really useful and productive way of reading the component configuration. You can enable a special endpoint to check your configuration by adding the following code to your `UseEndpoints` method (as part of Startup.cs).

```csharp
app.UseEndpoints(endpoints =>
{
    endpoints.MapGet("/config", async context =>
    {
        var config = (Configuration as IConfigurationRoot).GetDebugView();
        await context.Response.WriteAsync(config);
    });
});
```

Here is an example output:

![config-endpoint](/assets/endpoint-route/config-endpoint.png)

### NikiforovAll.ConfigurationDebugViewEndpoint

The example above works and everything, but I took a chance and wrapped this functionality into NuGet package - <https://github.com/NikiforovAll/ConfigurationDebugViewEndpoint>.

It is an example of how to organize code base and apply the technique to make your `Startup.cs` more readable and composable. I will guide you through the process.

Our goal is to have an extension method that will allow us to plug `/config` endpoint. Something like this:

```csharp
app.UseEndpoints(endpoints =>
{
    endpoints.MapConfigurationDebugView("/config", (options) => options.AllowDevelopmentOnly = true);
});
```

Let's start with the `ConfigurationDebugViewMiddleware`. We want to write IConfiguration debug view output to `Response`.

```csharp
public class ConfigurationDebugViewMiddleware
{
    public ConfigurationDebugViewMiddleware(RequestDelegate next) { }

    public async Task InvokeAsync(HttpContext httpContext)
    {
        var configuration = httpContext.RequestServices.GetService<IConfiguration>();
        var config = (configuration as IConfigurationRoot).GetDebugView();
        await httpContext.Response.WriteAsync(config);
    }
}
```

The trick is to create `EndpointRouteBuilderExtensions.cs` and write small extension method that will allow us to plug `ConfigurationDebugViewMiddleware`.

Generally, we follow the next approach/signature

```csharp
IEndpointConventionBuilder Map{FeatureToMap}(this IEndpointRouteBuilder endpoints, string pattern = <defaultPattern>, Action<{FeatureOptions}> configure);
```

The actual implementation is based on the fact that you can create a sub-pipeline using the same abstraction - `IApplicationBuilder` that you use for your `Startup.cs` pipeline. [IEndpointRouteBuilder.CreateApplicationBuilder](https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.routing.iendpointroutebuilder.createapplicationbuilder) creates a `IApplicationBuilder` that you can use and configure.

```csharp
endpoints.CreateApplicationBuilder()
    .UseMiddleware<LoggingMiddleware>()
    .UseMiddleware<CachingMiddleware>()
    .UseMiddleware<SOAPEndpointMiddleware>()
    .Build();
```

Complete implementation:

```csharp
/// <summary>
/// Provides extension methods for <see cref="IEndpointRouteBuilder"/> to add routes.
/// </summary>
public static class EndpointRouteBuilderExtensions
{
    /// <summary>
    /// Adds a configuration endpoint to the <see cref="IEndpointRouteBuilder"/> with the specified template.
    /// </summary>
    /// <param name="endpoints">The <see cref="IEndpointRouteBuilder"/> to add endpoint to.</param>
    /// <param name="pattern">The URL pattern of the endpoint.</param>
    /// <param name="optionsDelegate"></param>
    /// <returns>A route for the endpoint.</returns>
    public static IEndpointConventionBuilder? MapConfigurationDebugView(
        this IEndpointRouteBuilder endpoints,
        string pattern = "config",
        Action<ConfigurationDebugViewOptions>? optionsDelegate = default)
    {
        if (endpoints == null)
        {
            throw new ArgumentNullException(nameof(endpoints));
        }

        var options = new ConfigurationDebugViewOptions();
        optionsDelegate?.Invoke(options);

        return MapConfigurationDebugViewCore(endpoints, pattern, options);
    }

    private static IEndpointConventionBuilder? MapConfigurationDebugViewCore(IEndpointRouteBuilder endpoints, string pattern, ConfigurationDebugViewOptions options)
    {
        var environment = endpoints.ServiceProvider.GetRequiredService<IHostEnvironment>();
        var builder = endpoints.CreateApplicationBuilder();

        if (options.AllowDevelopmentOnly && !environment.IsDevelopment())
        {
            return null;
        }
        var pipeline = builder
            .UseMiddleware<ConfigurationDebugViewMiddleware>()
            .Build();

        return endpoints.Map(pattern, pipeline);
    }
}
```

## Summary

I've shared with you a simple but yet useful technique to organize your codebase. It allows you to keep your endpoint-related code nice and clean, developers can easily find extensions by conventions. Do you have other best practices to organize `Startup.cs`? Feel free to list them in the comments, I would like to hear from you!

You might want to try the configuration-debug-view NuGet package. <https://github.com/NikiforovAll/ConfigurationDebugViewEndpoint>.

## Reference

* [ASP.NET Core Middleware](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/middleware/)
* [Routing in ASP.NET Core](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/routing)
* [ASP.NET Core Series: Endpoint Routing](https://www.youtube.com/watch?v=fSSPEM3e7yY)
* [ASP.NET Core Series: Route To Code](https://www.youtube.com/watch?v=j-33Uz32hG0)
