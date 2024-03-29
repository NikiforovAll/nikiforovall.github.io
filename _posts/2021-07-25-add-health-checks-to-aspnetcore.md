---
layout: post
title: How to add Health Checks to ASP.NET Core project. A coding story.
categories: [  dotnet, aspnetcore, coding-stories ]
tags: [ dotnet, aspnetcore, healthchecks, coding-stories, engx, csharp ]
published: true
shortinfo: A coding story (<a href="https://codingstories.io/">https://codingstories.io/</a>) that explains how to add health checks to ASP.NET Core project.
fullview: false
comments: true
related: true
---

## TL;DR

Health checks are valuable and it is pretty straightforward to use them in ASP.NET Core. I've created a coding story to show you how to add and use them in different scenarios. (database, rabbitmq, downstream services).

---

Observability of the system is crucial for successful maintenance and monitoring. Health checks help you with that!

Below, you can find a coding story that describes the process of adding health checks support to ASP.NET Core project.

> https://codingstories.io/stories/6139f4a2f2cd3d0031cd8ef1/6103bf8972273c2133d37ce6
> https://gitlab.com/codingstories/how-to-add-health-checks-to-aspnetcore

![healthchecks-banner](/assets/add-health-check/healh-checks-coding-story.png)

### Sneak peek the result

By the end of the coding story, you will see something like the following:

```csharp
public class Startup
{
   public IConfiguration Configuration { get; set; }
   public Startup(IConfiguration configuration)
   {
      this.Configuration = configuration;
   }

   public void ConfigureServices(IServiceCollection services)
   {
      var connectionString = this.Configuration.GetConnectionString("DefaultConnection");
      var rabbitMqConnectionString = this.Configuration.GetConnectionString("RabbitMQ");
      var downstreamServiceUrl = this.Configuration["DownstreamService:BaseUrl"];
      services.AddHealthChecks()
            .AddSqlServer(
               connectionString,
               name: "Database",
               failureStatus: HealthStatus.Degraded,
               timeout: TimeSpan.FromSeconds(1),
               tags: new string[] { "services" })
            .AddRabbitMQ(
               rabbitMqConnectionString,
               name: "RabbitMQ",
               failureStatus: HealthStatus.Degraded,
               timeout: TimeSpan.FromSeconds(1),
               tags: new string[] { "services" })
            .AddUrlGroup(
               new Uri($"{downstreamServiceUrl}/health"),
               name: "Downstream API Health Check",
               failureStatus: HealthStatus.Unhealthy,
               timeout: TimeSpan.FromSeconds(3),
               tags: new string[] { "services" });
   }

   public void Configure(IApplicationBuilder app)
   {
      app.UseRouting();

      app.UseEndpoints(endpoints =>
      {
            endpoints.MapCustomHealthCheck();

            endpoints.MapGet("/{**path}", async context =>
            {
               await context.Response.WriteAsync(
                  "Navigate to /health to see the health status.");
            });
      });
   }
}
```

```csharp

public static class EndpointRouteBuilderExtensions
{
   /// <summary>
   /// Adds a Health Check endpoint to the <see cref="IEndpointRouteBuilder"/> with the specified template.
   /// </summary>
   /// <param name="endpoints">The <see cref="IEndpointRouteBuilder"/> to add endpoint to.</param>
   /// <param name="pattern">The URL pattern of the liveness endpoint.</param>
   /// <param name="servicesPattern">The URL pattern of the readiness endpoint.</param>
   /// <returns>A route for the endpoint.</returns>
   public static IEndpointRouteBuilder MapCustomHealthCheck(
      this IEndpointRouteBuilder endpoints,
      string pattern = "/health",
      string servicesPattern = "/health/ready")
   {
      if (endpoints == null)
      {
            throw new ArgumentNullException(nameof(endpoints));
      }

      endpoints.MapHealthChecks(pattern, new HealthCheckOptions()
      {
            Predicate = (check) => !check.Tags.Contains("services"),
            AllowCachingResponses = false,
            ResponseWriter = WriteResponse,
      });
      endpoints.MapHealthChecks(servicesPattern, new HealthCheckOptions()
      {
            Predicate = (check) => true,
            AllowCachingResponses = false,
            ResponseWriter = WriteResponse,
      });

      return endpoints;
   }

   private static Task WriteResponse(HttpContext context, HealthReport result)
   {
      context.Response.ContentType = "application/json; charset=utf-8";

      var options = new JsonWriterOptions
      {
            Indented = true
      };

      using var stream = new MemoryStream();
      using (var writer = new Utf8JsonWriter(stream, options))
      {
            writer.WriteStartObject();
            writer.WriteString("status", result.Status.ToString());
            writer.WriteStartObject("results");
            foreach (var entry in result.Entries)
            {
               writer.WriteStartObject(entry.Key);
               writer.WriteString("status", entry.Value.Status.ToString());
               writer.WriteEndObject();
            }
            writer.WriteEndObject();
            writer.WriteEndObject();
      }

      var json = Encoding.UTF8.GetString(stream.ToArray());

      return context.Response.WriteAsync(json);
   }
}
```

---

Please let me know what you think about this coding story. Feedback is very much appreciated 👍.

## Reference

* <https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks>
* <https://gitlab.com/NikiforovAll/how-to-add-health-checks-to-aspnetcore>
