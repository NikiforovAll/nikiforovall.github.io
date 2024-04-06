---
layout: post
title: Polymorphic serialization via System.Text.Json in ASP.NET Core Minimal API
categories: [ dotnet, aspnetcore ]
tags: [ dotnet, aspnetcore, openapi, minimalapi ]
published: true
shortinfo: In this article, we will explore the process of serializing a model hierarchy using `System.Text.Json` and how to accurately represent this serialized data in OpenAPI 3.0.
fullview: false
comments: true
related: true
mermaid: true
---

*Table of Contents*:

- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Serialization via `System.Text.Json`](#serialization-via-systemtextjson)
  - [Use `JsonDerivedTypeAttribute`](#use-jsonderivedtypeattribute)
  - [Use `DefaultJsonTypeInfoResolver` in situations when you can't apply attributes](#use-defaultjsontypeinforesolver-in-situations-when-you-cant-apply-attributes)
- [Configure OpenAPI](#configure-openapi)
- [Conclusion](#conclusion)
- [References](#references)

## TL;DR

In this article, we will explore the process of serializing a model hierarchy using `System.Text.Json` and how to accurately represent this serialized data in OpenAPI 3.0.

> Source code: <https://github.com/NikiforovAll/openapi-polymorphism>

## Introduction

In the context of our demonstration, we are dealing with a composite object. The [composite pattern](https://refactoring.guru/design-patterns/composite) allows us to treat individual objects and compositions of objects uniformly.

This pattern is particularly useful when dealing with a *hierarchy of objects* where you might need to work with a single instance of an object, or a whole group of them in a similar manner.

In our case, we want to serialize a composite object using `System.Text.Json` and represent this serialized data accurately in OpenAPI 3.0.

```csharp
public abstract record Component(string Name);

public record Leaf(string Name) : Component(Name);

public record Node(string Name, IList<Component>? Children = default) : Component(Name)
{
    public IList<Component> Children { get; init; } = Children ?? [];

    public void Add(Component component) => Children.Add(component);
};
```

For example, we would like to serialize something like following:

```csharp
private static Component GetNode()
{
    Node node = new("Root1")
    {
        Children =
        [
            new Node("N1")
            {
                Children =
                [
                    new Leaf("L1"),
                    new Leaf("L2")
                ]
            },
            new Node("N2")
            {
                Children =
                [
                    new Node("N3")
                    {
                        Children =
                        [
                            new Leaf("L3"),
                            new Leaf("L4")
                        ]
                    }
                ]
            }
        ]
    };

    return node;
}
```

## Serialization via `System.Text.Json`

Let's start the naive way - just use the model as it is:

```csharp
public static IEndpointRouteBuilder MapBasedOnAttribute(this IEndpointRouteBuilder app)
{
    app.MapGet("/v{version:apiVersion}/composite", () => GetNode() )
    .WithTags("Composite")
    .HasApiVersion(1)
    .WithOpenApi();

    return app;
}
```

The results are disappointing 🥲:

```json
{
  "children": [
    {
      "name": "N1"
    },
    {
      "name": "N2"
    }
  ],
  "name": "Root1"
}
```

Fortunately, we can serialize hierarchies properly starting from .NET 7. See <https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism> for more details.

### Use `JsonDerivedTypeAttribute`

All you need to do is to apply `JsonDerivedTypeAttribute` to the base class of the hierarchy you want to handle.

Let's try to do exactly that:

```csharp
[JsonDerivedType(typeof(Node))]
[JsonDerivedType(typeof(Leaf))]
public abstract record Component(string Name);

public record Leaf(string Name) : Component(Name);

public record Node(string Name, IList<Component>? Children = default) : Component(Name)
{
    public IList<Component> Children { get; init; } = Children ?? [];

    public void Add(Component component) => Children.Add(component);
};
```

Let's see the results:

```json
{
  "children": [
    {
      "children": [
        {
          "name": "L1"
        },
        {
          "name": "L2"
        }
      ],
      "name": "N1"
    },
    {
      "children": [
        {
          "children": [
            {
              "name": "L3"
            },
            {
              "name": "L4"
            }
          ],
          "name": "N3"
        }
      ],
      "name": "N2"
    }
  ],
  "name": "Root1"
}
```

This is better, but there is still room for improvement. We want our clients to be able properly deserialize the hierarchy. To achieve that, we need to add a **type discriminator** - a special JSON property containing the exact type.

Simply add `typeDiscriminator`:

```csharp
// public JsonDerivedTypeAttribute(Type derivedType, string typeDiscriminator);

[JsonDerivedType(typeof(Node), typeDiscriminator: nameof(Node))]
[JsonDerivedType(typeof(Leaf), typeDiscriminator: nameof(Leaf))]
public abstract record Component(string Name);

public record Leaf(string Name) : Component(Name);

public record Node(string Name, IList<Component>? Children = default) : Component(Name)
{
    public IList<Component> Children { get; init; } = Children ?? [];

    public void Add(Component component) => Children.Add(component);
};
```

Let's see the results:

```json
{
  "$type": "Node",
  "children": [
    {
      "$type": "Node",
      "children": [
        {
          "$type": "Leaf",
          "name": "L1"
        },
        {
          "$type": "Leaf",
          "name": "L2"
        }
      ],
      "name": "N1"
    },
    {
      "$type": "Node",
      "children": [
        {
          "$type": "Node",
          "children": [
            {
              "$type": "Leaf",
              "name": "L3"
            },
            {
              "$type": "Leaf",
              "name": "L4"
            }
          ],
          "name": "N3"
        }
      ],
      "name": "N2"
    }
  ],
  "name": "Root1"
}
```

Awesome, now our model serialized the way I wanted. 🙌

### Use `DefaultJsonTypeInfoResolver` in situations when you can't apply attributes

The application of attributes is done during design time, which means that you specify the attributes in your code before compiling and running it. Once the attributes are applied, they become a permanent part of the program element's definition. There are many situations when you can't apply attributes to a model. 

For example, cross-assembly hierarchies, third-party dependencies, etc.

From official docs:

> For use cases where attribute annotations are impractical or impossible, to configure polymorphism use the contract model. The contract model is a set of APIs that can be used to configure polymorphism in a type hierarchy by creating a custom `DefaultJsonTypeInfoResolver` subclass that dynamically provides polymorphic configuration per type.

```csharp
public class PolymorphicTypeResolver : DefaultJsonTypeInfoResolver
{
    public override JsonTypeInfo GetTypeInfo(Type type, JsonSerializerOptions options)
    {
        JsonTypeInfo jsonTypeInfo = base.GetTypeInfo(type, options);

        Type baseType = typeof(Component);
        if (jsonTypeInfo.Type == baseType)
        {
            jsonTypeInfo.PolymorphismOptions = new JsonPolymorphismOptions
            {
                TypeDiscriminatorPropertyName = "$type",
                IgnoreUnrecognizedTypeDiscriminators = true,
                UnknownDerivedTypeHandling = JsonUnknownDerivedTypeHandling.FailSerialization,
                DerivedTypes =
                {
                    new JsonDerivedType(typeof(Node), nameof(Node)),
                    new JsonDerivedType(typeof(Leaf), nameof(Leaf)),
                }
            };
        }

        return jsonTypeInfo;
    }
}
```

Here is how to add it to Minimal API:

```csharp
// Program.cs
builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.TypeInfoResolver = new PolymorphicTypeResolver();
});
```

```csharp
namespace Microsoft.AspNetCore.Http.Json
{
    /// <summary>
    /// Options to configure JSON serialization settings for Microsoft.AspNetCore.Http.HttpRequestJsonExtensions
    /// and Microsoft.AspNetCore.Http.HttpResponseJsonExtensions.
    /// </summary>
    public class JsonOptions
    {
        public JsonOptions();

        /// <summary>
        /// Gets the System.Text.Json.JsonSerializerOptions.
        /// </summary>
        public JsonSerializerOptions SerializerOptions { get; }
    }
}
```

The output is the same:

```json
{
  "$type": "Node",
  "children": [
    {
      "$type": "Node",
      "children": [
        {
          "$type": "Leaf",
          "name": "L1"
        },
        {
          "$type": "Leaf",
          "name": "L2"
        }
      ],
      "name": "N1"
    },
    {
      "$type": "Node",
      "children": [
        {
          "$type": "Node",
          "children": [
            {
              "$type": "Leaf",
              "name": "L3"
            },
            {
              "$type": "Leaf",
              "name": "L4"
            }
          ],
          "name": "N3"
        }
      ],
      "name": "N2"
    }
  ],
  "name": "Root1"
}
```

## Configure OpenAPI

In the modern world OpenAPI documents has become a necessity. These documents serve as a contract, allowing other systems to integrate with yours seamlessly.

Let's add additional OpenAPI metadata to the endpoint for demonstration purposes and see how the Swagger looks like:

```csharp
public static IEndpointRouteBuilder MapBasedOnAttribute(this IEndpointRouteBuilder app, ApiVersionSet versionSet)
{
    app.MapGet("/v{version:apiVersion}/composite", ExecuteAsync)
    .WithName("GetCompositeForAttributeAnnotatedModels")
    .WithTags("Composite")
    .WithApiVersionSet(versionSet)
    .HasApiVersion(1)
    .WithOpenApi(operation => new(operation)
    {
        Summary = "Polymorphism via JsonDerivedTypeAttribute",
        Description = "Composite based on polymorphic serialization with attributes",
    })
    .ProducesProblem(StatusCodes.Status401Unauthorized);

    return app;
}
```

If we open a Swagger endpoint, we can see that the schema doesn't contain complete information about the model. That's a pity 🙂

![without-openapi](/assets/openapi-polymorphism/without-openapi.png)

```jsonc
// http://localhost:5077/swagger/v1/swagger.json

{
  "openapi": "3.0.1",
  "info": {
    "title": "Composite V1",
    "version": "v1"
  },
  "paths": {
    "/v1/composite": {
      "get": {
        "tags": [
          "Composite"
        ],
        "summary": "Polymorphism via JsonDerivedTypeAttribute",
        "description": "Composite based on polymorphic serialization with attributes",
        "operationId": "GetCompositeForAttributeAnnotatedModels",
        "requestBody": {
          "content": {
            
          }
        },
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Component"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Component": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "nullable": true
          }
        },
        "additionalProperties": false
      }
    }
  }
}
```

Luckily, we can fix it by configuring OpenAPI document generation as part of `Swashbuckle.AspNetCore` NuGet package:

```csharp
services.AddSwaggerGen(options =>
{
    options.UseOneOfForPolymorphism(); // <-- add this
    options.UseAllOfForInheritance(); // <-- add this

    options.SwaggerDoc("v1", new() { Title = "Composite V1", Version = "v1" });
    options.SwaggerDoc("v2", new() { Title = "Composite V2", Version = "v2" });

    options.OperationFilter<SwaggerDefaultValues>();
});
```

```csharp
// SwaggerGenOptionsExtensions.cs

/// <summary>
/// Enables polymorphic schema generation. If enabled, request and response schemas
/// will contain the oneOf construct to describe sub types as a set of alternative
/// schemas.
/// </summary>

public static void UseOneOfForPolymorphism(this SwaggerGenOptions swaggerGenOptions)
{
    swaggerGenOptions.SchemaGeneratorOptions.UseOneOfForPolymorphism = true;
}

/// <summary>
/// Enables composite schema generation. If enabled, subtype schemas will contain
/// the allOf construct to incorporate properties from the base class instead of
/// defining those properties inline.
/// </summary>
public static void UseAllOfForInheritance(this SwaggerGenOptions swaggerGenOptions)
{
    swaggerGenOptions.SchemaGeneratorOptions.UseAllOfForInheritance = true;
}
```


![with-openapi](/assets/openapi-polymorphism/with-openapi.png)

```jsonc
// http://localhost:5077/swagger/v1/swagger.json

{
  "openapi": "3.0.1",
  "info": {
    "title": "Composite V1",
    "version": "v1"
  },
  "paths": {
    "/v1/composite": {
      "get": {
        "tags": [
          "Composite"
        ],
        "summary": "Polymorphism via JsonDerivedTypeAttribute",
        "description": "Composite based on polymorphic serialization with attributes",
        "operationId": "GetCompositeForAttributeAnnotatedModels",
        "requestBody": {
          "content": {
            
          }
        },
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "oneOf": [
                    {
                      "$ref": "#/components/schemas/Leaf"
                    },
                    {
                      "$ref": "#/components/schemas/Node"
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Component": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "nullable": true
          }
        },
        "additionalProperties": false
      },
      "Leaf": {
        "type": "object",
        "allOf": [
          {
            "$ref": "#/components/schemas/Component"
          }
        ],
        "additionalProperties": false
      },
      "Node": {
        "type": "object",
        "allOf": [
          {
            "$ref": "#/components/schemas/Component"
          }
        ],
        "properties": {
          "children": {
            "type": "array",
            "items": {
              "oneOf": [
                {
                  "$ref": "#/components/schemas/Leaf"
                },
                {
                  "$ref": "#/components/schemas/Node"
                }
              ]
            },
            "nullable": true
          }
        },
        "additionalProperties": false
      }
    }
  }
}
```

## Conclusion

In this article, we've explored how to serialize a model hierarchy using `System.Text.Json` in ASP.NET Core Minimal API. We've seen how to use `JsonDerivedTypeAttribute` and `DefaultJsonTypeInfoResolver` to handle polymorphic serialization, allowing us to accurately represent complex object hierarchies in JSON format. We've also discussed how to configure OpenAPI to provide a clear and accurate representation of our serialized data.

## References

* <https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/polymorphism>
* <https://github.com/dotnet/aspnet-api-versioning>
* <https://github.com/dotnet/aspnet-api-versioning/blob/main/examples/AspNetCore/WebApi/MinimalOpenApiExample/Program.cs>
* <https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/handle-errors?view=aspnetcore-8.0#problem-details>
* <https://github.com/dotnet/aspnetcore/issues/54599>
