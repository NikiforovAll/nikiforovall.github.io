---
layout: post
title: An opinionated look at Minimal API in .NET 6
categories: [  dotnet, aspnetcore ]
tags: [ dotnet, aspnetcore, minimal-api, coding-stories ]
published: true
shortinfo: In this blog post I share my thoughts on how to organize Minimal API project to keep code structure under control and still get benefits from low-ceremony approach.
fullview: false
comments: true
hide-related: false
---

## TL;DR

In this blog post, I share my thoughts on how to organize Minimal API projects to keep code structure under control and still get benefits from the low-ceremony approach.

---

## Introduction

Minimal API is a refreshing and promising application model for building lightweight Web APIs. Now you can create a microservice and start prototyping without the necessity to create lots of boilerplate code and worrying about too much about code structure.

```csharp
var app = WebApplication.Create();
app.MapGet("/", () => "Hello World!");
app.Run();
```

Presumably, this kind of style gives you a productivity boost and flattens the learning curve for newcomers. So it is considered as a more lightweight version, but using Minimal API doesn't mean you have to write small applications. It is rather a different application model that one day will be as much powerful as MVC counterpart.

## Problem Statement

One of the problems with Minimal API is that `Program.cs` can get to big. So initial simplicity may lead you to the [big ball of mud](https://en.wikipedia.org/wiki/Big_ball_of_mud) type of solution. At this point, you want to use refactoring techniques and my goal is to share some ideas on how to tackle emerging challenges.

### Coding Story: Building Minimal API

I've prepared a coding story for you so you can see how to build Minimal API step-by-step. I strongly recommend checking it before you move further.

Source code can be found at GitHub: [NikiforovAll/minimal-api-example](https://github.com/NikiforovAll/minimal-api-example)

> https://codingstories.io/story/https%3A%2F%2Fgitlab.com%2FNikiforovAll%2Fmodular-minimal-api

![minimal-api-banner](/assets/minimal-api/minimal-api-blogpost-cover.png)

## Recommendations

My general recommendation is to write something that may be called Modular Minimal API or Vertical Slice Minimal API.

### Keep Program.cs aka Composition Root small

A Composition Root is a unique location in an application where modules are composed together. You should have a good understanding of what this application is about just by looking at it.

You want to keep Program.cs clean and focus on high-level modules.

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.AddSerilog();
builder.AddSwagger();
builder.AddAuthentication();
builder.AddAuthorization();
builder.Services.AddCors();
builder.AddStorage();

builder.Services.AddCarter();

var app = builder.Build();
var environment = app.Environment;

app
    .UseExceptionHandling(environment)
    .UseSwaggerEndpoints(routePrefix: string.Empty)
    .UseAppCors()
    .UseAuthentication()
    .UseAuthorization();

app.MapCarter();

app.Run();
```

💡Tip: One of the techniques you can apply here is to create extension methods for `IServiceCollection`, `IApplicationBuilder`. For Minimal API I would suggest using "file-per-concern" organization. See *ApplicationBuilderExtensions* and *ServiceCollectionExtensions* folders.

```bash
$ tree
.
├── ApplicationBuilderExtensions
│   ├── ApplicationBuilderExtensions.cs
│   └── ApplicationBuilderExtensions.OpenAPI.cs
├── assets
│   └── run.http
├── Features
│   ├── HomeModule.cs
│   └── TodosModule.cs
├── GlobalUsing.cs
├── MinimalAPI.csproj
├── Program.cs
├── Properties
│   └── launchSettings.json
├── ServiceCollectionExtensions
│   ├── ServiceCollectionExtensions.Auth.cs
│   ├── ServiceCollectionExtensions.Logging.cs
│   ├── ServiceCollectionExtensions.OpenAPI.cs
│   └── ServiceCollectionExtensions.Persistence.cs
└── todos.db
```

And here is an example of how to add OpenAPI/Swagger concern:

```csharp
namespace Microsoft.Extensions.DependencyInjection;

using Microsoft.OpenApi.Models;

public static partial class ServiceCollectionExtensions
{
    public static WebApplicationBuilder AddSwagger(this WebApplicationBuilder builder)
    {
        builder.Services.AddSwagger();

        return builder;
    }

    public static IServiceCollection AddSwagger(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo()
            {
                Description = "Minimal API Demo",
                Title = "Minimal API Demo",
                Version = "v1",
                Contact = new OpenApiContact()
                {
                    Name = "Oleksii Nikiforov",
                    Url = new Uri("https://github.com/nikiforovall")
                }
            });
        });

        return services;
    }
}
```

### Organize endpoints around features

A [MinimalApiPlayground](https://github.com/DamianEdwards/MinimalApiPlayground) from Damian Edwards is a really good place to start learning more about Minimal API, but things start to get hairy (<https://github.com/DamianEdwards/MinimalApiPlayground/blob/main/src/Todo.Dapper/Program.cs>). Functionality by functionality you turn into a scrolling machine more and more - no good 😛. It means we need to organize code into manageable components/modules.

Modular approach allows us to focus on cohesive units of functionality. Luckily, there is an awesome open source project - [Carter](https://github.com/CarterCommunity/Carter). It supports some essential missing features (Minimal API .NET 6) and one of them is module registration `ICarterModule`.

```csharp
namespace MinimalAPI;

using Dapper;
using Microsoft.Data.Sqlite;

public class TodosModule : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/todos", GetTodos);
        app.MapGet("/api/todos/{id}", GetTodo);
        app.MapPost("/api/todos", CreateTodo);
        app.MapPut("/api/todos/{id}/mark-complete", MarkComplete);
        app.MapDelete("/api/todos/{id}", DeleteTodo);
    }
    private static async Task<IResult> GetTodo(int id, SqliteConnection db) =>
        await db.QuerySingleOrDefaultAsync<Todo>(
            "SELECT * FROM Todos WHERE Id = @id", new { id })
            is Todo todo
                ? Results.Ok(todo)
                : Results.NotFound();

    private async Task<IEnumerable<Todo>> GetTodos(SqliteConnection db) =>
        await db.QueryAsync<Todo>("SELECT * FROM Todos");

    private static async Task<IResult> CreateTodo(Todo todo, SqliteConnection db)
    {
        var newTodo = await db.QuerySingleAsync<Todo>(
            "INSERT INTO Todos(Title, IsComplete) Values(@Title, @IsComplete) RETURNING * ", todo);

        return Results.Created($"/todos/{newTodo.Id}", newTodo);
    }
    private static async Task<IResult> DeleteTodo(int id, SqliteConnection db) =>
        await db.ExecuteAsync(
            "DELETE FROM Todos WHERE Id = @id", new { id }) == 1
            ? Results.NoContent()
            : Results.NotFound();
    private static async Task<IResult> MarkComplete(int id, SqliteConnection db) =>
        await db.ExecuteAsync(
            "UPDATE Todos SET IsComplete = true WHERE Id = @Id", new { Id = id }) == 1
            ? Results.NoContent()
            : Results.NotFound();
}

public class Todo
{
    public int Id { get; set; }
    public string? Title { get; set; }
    public bool IsComplete { get; set; }
}
```

💡Tip: You can use *Method Group* (C#) instead of lambda expression to avoid formatting issues and keep code clean. Also, it provides automatic endpoint metadata [aspnetcore#34540](https://github.com/dotnet/aspnetcore/issues/34540), that's cool.

```csharp
// FROM
app.MapGet("/todos", async (SqliteConnection db) =>
    await db.QueryAsync<Todo>("SELECT * FROM Todos"));

// TO
app.MapGet("/api/todos", GetTodos);

async Task<IEnumerable<Todo>> GetTodos(SqliteConnection db) =>
        await db.QueryAsync<Todo>("SELECT * FROM Todos");
```

To register modules you simply need to add two lines of code in `Program.cs`. Modules are registered based on assemblies scanning and added to DI automatically, [see](https://github.com/CarterCommunity/Carter/blob/net6/src/Carter/CarterExtensions.cs). You can go even further and split Carter modules into separate assemblies.

```csharp
builder.Services.AddCarter();
// ...
app.MapCarter();
```

I recommend you to enhance your Minimal APIs with *Carter* because it tries to close the gap between Minimal API and full-fledged ASP.NET MVC version. 
Go check out Carter on GitHub, [give them a Star](https://github.com/CarterCommunity/Carter), try it out!

### High cohesion

Modules go well together with [Vertical Slice Architecture](https://jimmybogard.com/vertical-slice-architecture/). Simply start with `./Features` folder and keep related models, services, factories, etc. together.

## Conclusion

Minimal API does mean your application has to be small. In this blog post, I've shared some ideas on how to handle project complexity. Personally, I like this style and believe that one day Minimal API will be as much powerful as much ASP.NET MVC.

---

## Reference

* <https://www.hanselman.com/blog/carter-community-for-aspnet-core-means-enjoyable-web-apis-on-the-cutting-edge>
* <https://github.com/CarterCommunity/Carter>
* <https://github.com/AnthonyGiretti/aspnetcore-minimal-api>
* <https://www.youtube.com/watch?v=4ORO-KOufeU&ab_channel=NickChapsas>
* <https://www.youtube.com/watch?v=bSJ5n7alhTs&ab_channel=dotNET>
* <https://benfoster.io/blog/mvc-to-minimal-apis-aspnet-6/>
* <https://blog.ploeh.dk/2011/07/28/CompositionRoot/>
