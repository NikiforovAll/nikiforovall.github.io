---
layout: post
title: "Unlocking the Power of TypedResults in Endpoints: A Consistent Approach to Strongly Typed APIs in .NET"
categories: [ dotnet ]
tags: [ dotnet, aspnetcore ]
published: true
shortinfo: "Explore the use of TypedResults in .NET endpoints to achieve a consistent and strongly typed APIs"
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

- [TL;DR](#tldr)
- [Introduction](#introduction)
  - [Motivation](#motivation)
- [Solution - use `TypedResults`](#solution---use-typedresults)
  - [Example](#example)
    - [Adding OpenAPI metadata](#adding-openapi-metadata)
    - [Automatic model validation](#automatic-model-validation)
    - [Exception handling](#exception-handling)
  - [Control the serialization via `JsonSerializerOptions`](#control-the-serialization-via-jsonserializeroptions)
- [Bonus: `Nall.ResultEndpoints.Template` template](#bonus-nallresultendpointstemplate-template)
- [Conclusion](#conclusion)
- [References](#references)

This blog post explores the use of `TypedResults` in .NET endpoints to achieve a consistent and strongly typed API development approach. We discuss the benefits of `TypedResults` over traditional `ActionResult`, emphasizing how they enhance type safety and API consistency.

**Source code**: <https://github.com/NikiforovAll/result-endpoints-template>

You can use `dotnet new` template to get started with `TypedResults` in your .NET projects:

```bash
dotnet new install Nall.ResultEndpoints.Template
dotnet new result-endpoints-api
```

Here is a simple example of how you can use `TypedResults` in your .NET endpoints:

```csharp
public class HelloWorld : EndpointBaseSync.WithRequest<string>.WithResult<Ok<string>>
{
    [EndpointSummary("Says hello")]
    [EndpointName(nameof(HelloWorld))]
    [HttpGet("/hello-world")]
    public override Results<Ok<string>> Handle([FromQuery(Name = "q")] string request)
    {
        return TypedResults.Ok($"Hello, {request}");
    }
}
```

## Introduction

In this blog post I want to show you the opinionated approach to building APIs in .NET using `TypedResults` in MVC based Web API implementations (aka Controllers).

💡 Thought this article, I will use an awesome library called [Ardalis.ApiEndpoints](https://github.com/ardalis/ApiEndpoints) it's basically an alternative to the traditional `Controller` approach in ASP.NET Core built on top of MVC. It provides a more structured and consistent way to build APIs using `Endpoints` instead of `Controllers`. The approach resembles the minimal API approach but differs in many ways.

From the `Ardalis.ApiEndpoints` documentation:

> MVC Controllers are essentially an antipattern. They're dinosaurs. They are collections of methods that never call one another and rarely operate on the same state. They're not cohesive. They tend to become bloated and to grow out of control...

My goal is to show you how to enhance the `Ardalis.ApiEndpoints` library with `TypedResults` to achieve a more consistent and strongly typed API development approach.

### Motivation

But, first, let's talk about the problem we are trying to solve. When you are building an API, you need to return a response to the client. In .NET, you can use `ActionResult` to return a response from your endpoint. However, `ActionResult` is an umbrella type that can represent any kind of response.

But, these details are important since they are part of the public contract of your API, we should manage them explicitly and carefully.

☝️Furthermore, since the OpenAPI specification is becoming more and more popular, it is important to have a consistent response structure across your API. Nowadays, it is common to generate OpenAPI documentation and client SDKs based on your API code. If you use `ActionResult`, you will have to manually document the response structure in your OpenAPI definitions, which can lead to *inconsistencies between the actual response and OpenAPI definitions*.

Take a look at example below:

```csharp
public class HelloWorldActionResult : EndpointBaseSync.WithRequest<string>.WithActionResult<string>
{
    [HttpGet("/hello-world")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public override ActionResult<string> Handle(string request)
    {
        if (request == "badrequest")
        {
            BadRequest(new { message = "Something bad happened" });
        }

        return Ok($"Hello, {request}");
    }
}
```

What is wrong with this code? The problem is that the response structure is not explicitly defined in the code. The response structure is defined in the `ProducesResponseType` attribute, which is not enforced by the compiler. This can lead to inconsistencies between the actual response and OpenAPI definitions.

## Solution - use `TypedResults`

Turns out you can use `TypedResults` to solve this problem. 🤔

The `IResult` interface defines a contract that represents the result of an HTTP endpoint. The static `Results` class and the static `TypedResults` are used to create various `IResult` objects that represent different types of responses. It is usually used in in [minimal APIs scenarios](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/responses?view=aspnetcore-8.0#iresult-return-values).

Returning `TypedResults` rather than `Results` has the following advantages:

* `TypedResults` helpers return strongly typed objects, which can improve code readability, unit testing, and reduce the chance of runtime errors.
* The implementation type [automatically provides the response type metadata for OpenAPI](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/aspnetcore-openapi#describe-response-types) to describe the endpoint. 🤩

Although, `TypedResults` class is usually used in minimal APIs scenarios,it can be used in MVC based Web API implementations as well.

### Example

Down below, we define an endpoints that returns `Results<Ok<string>, BadRequest<ProblemDetails>>` which is like a discriminated union of `Ok<string>` and `BadRequest<ProblemDetails>`. It means that the endpoint can return either `Ok<string>` or `BadRequest<ProblemDetails>`. Trying to return any other type will result in a compile-time error. This is exactly what we want to achieve!

```csharp
public class HelloWorld
    : EndpointBaseSync.WithRequest<string>.WithResult<
        Results<Ok<string>, BadRequest<ProblemDetails>>
    >
{
    [HttpGet("/hello-world")]
    public override Results<Ok<string>, BadRequest<ProblemDetails>> Handle(
        string request
    )
    {
        if (request == "badrequest")
        {
            return TypedResults.BadRequest(
                TypedResults.Problem("Something bad happened").ProblemDetails
            );
        }

        return TypedResults.Ok($"Hello, {request}");
    }
}
```

My goal is to give you a **comprehensive guide** to this approach. Let's take a look at some other scenarios and gotchas you might encounter when using `TypedResults` and `Ardalis.ApiEndpoints` in your .NET projects.

#### Adding OpenAPI metadata

To add OpenAPI metadata to your endpoint, you can use the `EndpointSummary` and `EndpointName` attributes. They are defined in `Microsoft.AspNetCore.Http` namespace and are used by `Swashbuckle.AspNetCore` to generate OpenAPI documentation. The great thing about these attributes is that they are OpenAPI-generation library agnostic which gives you the flexibility to switch between different libraries.

```csharp
public class HelloWorld : EndpointBaseSync.WithRequest<string>.WithResult<Ok<string>>
{
    [EndpointSummary("Says hello")]
    [EndpointDescription("Says hello based on the request")]
    [Tags("Hello")]
    [EndpointName(nameof(HelloWorld))]
    [HttpGet("/hello-world")]
    public override Ok<string> Handle(
        [FromQuery(Name = "q")] [Length(3, 100)] string request
    )
    {
        return TypedResults.Ok($"Hello, {request}");
    }
}
```


#### Automatic model validation

By default, `EndpointBaseSync` and `EndpointBaseAsync` inherits from `ControllerBase` which means that the model validation is automatically enabled. This means that if you have a model with data annotations, the model will be automatically validated before the endpoint is executed. If the model is invalid, the endpoint will return `BadRequest<ProblemDetails>` with the validation errors. You can control this behavior by setting the `SuppressModelStateInvalidFilter` property in the `ApiBehaviorOptions` option.

But because of this automatic validation, a *problem arises*. The `BadRequest<ProblemDetails>` response produced via model validation is not a regular response type because it is not returned by the endpoint itself; instead, it is returned by the framework when the model is invalid.

To fix this, we can assume that all endpoints can potentially return `BadRequest<ProblemDetails>` and add it to the list of possible responses globally. This way, we can ensure that the response structure is consistent across all endpoints.

```csharp

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();

builder.Services.AddControllers(options =>
{
    options.Filters.Add(new ProducesResponseTypeAttribute(typeof(ProblemDetails), 400)); // add this to solve the problem
});

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = false; // just an example, validation is enabled by default
});

var app = builder.Build();
app.MapControllers();

app.Run();
```

Let's apply some request validation to our endpoint:

```csharp
public class HelloWorld : EndpointBaseSync.WithRequest<string>.WithResult<Ok<string>>
{
    [EndpointSummary("Says hello")]
    [EndpointDescription("Says hello based on the request")]
    [Tags("Hello")]
    [EndpointName(nameof(HelloWorld))]
    [HttpGet("/hello-world")]
    public override Ok<string> Handle(
        [FromQuery(Name = "q")] [Length(3, 100)] string request
    )
    {
        return TypedResults.Ok($"Hello, {request}");
    }
}
```

<center>
    <img src="/assets/result-endpoints/validation-demo.png" style="margin: 15px;" width="100%">
</center>

And here is the response:

```bash
❯ curl -X 'GET'   'http://localhost:5164/hello-world?q=1'   -H 'accept: application/json' -s | jq
```
```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "q": [
      "The field request must be a string or collection type with a minimum length of '3' and maximum length of '100'."
    ]
  },
  "traceId": "00-6f6f77eb35c176f153d8d9b5378b69d9-9fa65ede2b6d7ba0-00"
}
```

#### Exception handling

I don't recommend to use exceptions for the control flow in your application. However, they are inevitable. It means this is another case when we want to extend common response types to make our API consistent. The approach is similar to the one we used for model validation.

It is a global exception handler added via `UseExceptionHandler` that returns `InternalServerError<ProblemDetails>`.

See the official docs for more details: [Handle errors in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling?view=aspnetcore-8.0).

```csharp

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();

builder.Services.AddControllers(options =>
{
    options.Filters.Add(new ProducesResponseTypeAttribute(typeof(ProblemDetails), 500)); // add this to solve the problem
    options.Filters.Add(new ProducesResponseTypeAttribute(typeof(ProblemDetails), 400));
})

var app = builder.Build();

app.MapControllers();
app.UseExceptionHandler();
app.UseStatusCodePages();

app.Run();
```

Here is an example of response:

```bash
❯ curl -X 'GET'   'http://localhost:5164/hello-world?q=error'   -H 'accept: application/json' -s | jq
```

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.6.1",
  "title": "System.Exception",
  "status": 500,
  "detail": "Something went wrong...",
  "exception": {
    "details": "System.Exception: Something went wrong...\r\n   at ResultEndpoints.Endpoints.HelloWorld.Handle(String request) ...",
    "path": "/hello-world",
    "endpoint": "ResultEndpoints.Endpoints.HelloWorld.Handle (ResultEndpoints)",
    "routeValues": {
      "action": "Handle",
      "controller": "HelloWorld"
    }
  },
  "traceId": "00-1b84386819492efe10684550ca737f1e-d06bfba710a5655c-00"
}
```

### Control the serialization via `JsonSerializerOptions`

There is a gotacha when using `TypedResults` - when returning a TypedResult from a controller or minimal API endpoint the configured JsonOptions are not used.

Take a look at <https://github.com/dotnet/aspnetcore/issues/45872> for more details.

For example, if you want to specify `JsonStringEnumConverter` to control the serialization of enums, you need to add it to multiple places to make it work correctly.

```csharp
var builder = WebApplication.CreateBuilder(args);

var enumConverter = new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(enumConverter);
});

builder.Services.ConfigureHttpJsonOptions(opt =>
{
    // this one is used during the serialization of the response TypedResults, ref: https://github.com/dotnet/aspnetcore/issues/45872
    opt.SerializerOptions.Converters.Add(enumConverter);
});

var app = builder.Build();
app.MapControllers();
app.Run();
```

## Bonus: `Nall.ResultEndpoints.Template` template

I've prepare  a `dotnet new` template to get started with `TypedResults` in your .NET projects. You can install it via the following command:

```bash
dotnet new install Nall.ResultEndpoints.
```

It has everything you need to get started with this approach. You can create a new project using the following command:

```bash
dotnet new result-endpoints-api
```

<center>
    <img src="/assets/result-endpoints/swagger.png" style="margin: 15px;" width="100%">
</center>

Here are some of the endpoints that you can find in the template:

List all todos:

```csharp
public record ListTodosRequest
{
    [FromQuery(Name = "completed")]
    public bool? Completed { get; set; }
}

public class ListTodos(TodoContext context)
    : EndpointBaseSync.WithRequest<ListTodosRequest>.WithResult<Ok<IEnumerable<TodoViewModel>>>
{
    [EndpointSummary("List todos")]
    [EndpointDescription("List todos based on the request")]
    [Tags("Todo")]
    [EndpointName(nameof(ListTodos))]
    [HttpGet("/todos")]
    public override Ok<IEnumerable<TodoViewModel>> Handle(ListTodosRequest request)
    {
        var query = context.Todos.AsQueryable();

        if (request.Completed.HasValue)
        {
            query = query.Where(t => t.Completed == request.Completed.Value);
        }

        var items = query.OrderBy(t => t.Order).ToList();

        return TypedResults.Ok(items.Select(TodoViewModel.From));
    }
}
```

💡 Note, we can use a "request object" (`ListTodosRequest` in this case) to structure the input and use model binding attributes to control the process.

Create a new todo:

```csharp
public record CreateTodoRequest
{
    [Required]
    [Length(1, 100)]
    public required string Title { get; set; }

    [Range(1, int.MaxValue)]
    public int Order { get; set; }

    public static TodoItem From(CreateTodoRequest todo) =>
        new() { Title = todo.Title, Order = todo.Order };
}

public class CreateTodo(TodoContext context)
    : EndpointBaseAsync.WithRequest<CreateTodoRequest>.WithResult<CreatedAtRoute<TodoViewModel>>
{
    [EndpointSummary("Create todo")]
    [EndpointDescription("Create todo based on the request")]
    [Tags("Todo")]
    [EndpointName(nameof(CreateTodo))]
    [HttpPost("/todos")]
    public override async Task<CreatedAtRoute<TodoViewModel>> HandleAsync(
        [FromBody] CreateTodoRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var item = CreateTodoRequest.From(request);
        context.Todos.Add(item);

        await context.SaveChangesAsync(cancellationToken);

        return TypedResults.CreatedAtRoute(
            TodoViewModel.From(item),
            nameof(GetTodo),
            new RouteValueDictionary(new { id = item.Id })
        );
    }
}
```

💡Note, we can use `EndpointBaseAsync` to describe async endpoints.

## Conclusion

In this blog post, I've shown you how to use `TypedResults` in .NET endpoints to achieve a consistent and strongly typed API development approach. I've discussed the benefits of `TypedResults` over traditional `ActionResult`. Hope this article gives you enough information to get started with this approach in your .NET projects 🚀. Let me know what you think!

## References

- <https://github.com/NikiforovAll/result-endpoints-template>
- <https://github.com/ardalis/ApiEndpoints>
- <https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/responses?view=aspnetcore-8.0#iresult-return-values>
- <https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling?view=aspnetcore-8.0>