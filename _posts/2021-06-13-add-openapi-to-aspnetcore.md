---
layout: post
title: How to add OpenAPI to ASP.NET Core project. A coding story.
categories: [  dotnet, aspnetcore, coding-stories ]
tags: [ dotnet, aspnetcore, openapi, coding-stories, engx, csharp ]
published: true
shortinfo: A coding story (<a href="https://codingstories.io/">https://codingstories.io/</a>) that explains how to enhance your project with OpenAPI support.
fullview: false
comments: true
hide-related: false
---

## TL;DR

OpenAPI is de facto standard that you should use to increase explorability of your ASP.NET Core projects.

---

Previously, I [blogged about](https://nikiforovall.github.io/dotnet/coding-stories/2021/03/14/coding-story.html) the tool <https://codingstories.io/> to share step-by-step guides and real programming experience in general. In this blog post, you will find a coding story that describes the process of adding OpenAPI support to a ASP.NET Core project.

OpenAPI is great and you should definitely consider it. From this point, please navigate to the actual coding story [how-to-add-openapi-to-aspnetcore](https://codingstories.io/story/https%3A%2F%2Fgitlab.com%2FNikiforovAll%2Fhow-to-add-openapi-to-aspnetcore), it is supposed to be self-contained and easy to understand. I'll see you there!

![openapi-banner](/assets/add-openapi/copding-story-openapi-banner.png)

### Sneak peek the result

By the end of the coding story, you will see something like following:

```csharp
public class Startup
{
   public void ConfigureServices(IServiceCollection services)
   {
      services.AddControllers();
      services.AddApiVersioning(options =>
      {
            options.ReportApiVersions = true;
            options.DefaultApiVersion = new ApiVersion(2, 0);
            options.AssumeDefaultVersionWhenUnspecified = true;
      });
      services.AddSwaggerGen(options =>
      {
            options.SwaggerDoc("v1", new OpenApiInfo()
            {
               Title = "Sample API",
               Version = "v1",
               Description = "A sample application with Swagger, Swashbuckle, and API versioning.",
               Contact = new OpenApiContact() { Name = "Sample User", Email = "sample@user.com" },
               License = new OpenApiLicense() { Name = "MIT", Url = new Uri("https://opensource.org/licenses/MIT") }
            });

            options.SwaggerDoc("v2", new OpenApiInfo()
            {
               Title = "Sample API",
               Version = "v2",
               Description = "A sample application with Swagger, Swashbuckle, and API versioning.",
               Contact = new OpenApiContact() { Name = "Sample User", Email = "sample@user.com" },
               License = new OpenApiLicense() { Name = "MIT", Url = new Uri("https://opensource.org/licenses/MIT") }
            });

            options.OperationFilter<SwaggerDefaultValues>();

      });
      services.AddVersionedApiExplorer(options =>
      {
            // Add the versioned api explorer, which also adds IApiVersionDescriptionProvider service
            // Note: the specified format code will format the version as "'v'major[.minor][-status]"
            options.GroupNameFormat = "'v'VVV";
      });
   }

   public void Configure(
      IApplicationBuilder app,
      IWebHostEnvironment env,
      IApiVersionDescriptionProvider apiVersionDescriptionProvider)
   {
      if (env.IsDevelopment())
      {
            app.UseDeveloperExceptionPage();
      }

      app.UseRouting();

      app.UseEndpoints(endpoints => endpoints.MapControllers());
      app.UseSwagger();
      app.UseSwaggerUI(c =>
      {
            foreach (var description in apiVersionDescriptionProvider.ApiVersionDescriptions.Reverse())
            {
               c.SwaggerEndpoint($"/swagger/{description.GroupName}/swagger.json",
                  description.GroupName.ToUpperInvariant());
            }
            c.RoutePrefix = string.Empty;
      });
   }

   static string XmlCommentsFilePath
   {
      get
      {
            var basePath = PlatformServices.Default.Application.ApplicationBasePath;
            var fileName = typeof(Startup).GetTypeInfo().Assembly.GetName().Name + ".xml";
            return Path.Combine(basePath, fileName);
      }
   }
}
```

---

Please let me know what you think about this coding story. A feedback is very much appreciated 👍.

## Reference

* <https://docs.microsoft.com/en-us/aspnet/core/tutorials/web-api-help-pages-using-swagger>
* <https://docs.microsoft.com/en-us/aspnet/core/tutorials/getting-started-with-swashbuckle>
* <https://github.com/microsoft/aspnet-api-versioning/tree/master/samples/aspnetcore>
