---
layout: post
title: "Explore .NET application dependencies by using Dependify tool"
categories: [ dotnet ]
tags: [ dotnet, aspire ]
published: true
shortinfo: "Use Dependify tool to navigate the dependency graph of your .NET application. You can use UI, CLI or API to explore the dependencies."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

This post demonstrates how to install and use the Dependify tool. It can be used to explore application dependencies between modules.

**Source code**: <https://github.com/NikiforovAll/dependify>

## Introduction

In large projects, managing dependencies can become challenging due to the complexity and interconnectedness of various components. It can be difficult to navigate through the project and make assumptions about the dependencies without proper tooling or documentation.

Here are a few reasons why it can be hard to navigate project dependencies in large projects:

**Complexity**: Large projects often consist of numerous modules. Understanding how these dependencies interact with each other can be overwhelming, especially when there are multiple layers of dependencies.

**Dependency Chains**: Dependencies can form long chains, where one module depends on another, which in turn depends on another, and so on. Tracking these chains and understanding the impact of changes can be challenging, as a modification in one module may have cascading effects on other modules.

**Lack of Documentation**: In some cases, projects may lack comprehensive documentation that clearly outlines the dependencies and their relationships. Without proper documentation, developers may need to spend extra time investigating and reverse-engineering the project structure to understand the dependencies.

To address these challenges, you can use the Dependify tool, which provides a visual representation of the dependencies in your .NET application. This tool allows you to explore the dependency graph, view the relationships between components, and identify potential issues or bottlenecks in your project.

The tool can be used in different ways, such as through a graphical user interface (*UI*), a command-line interface (*CLI*), or an application programming interface (*API*). This flexibility allows you to choose the most suitable method for your workflow and preferences.

| Package                     | Version                                                                                                                      | Description    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `Dependify.Cli`             | [![Nuget](https://img.shields.io/nuget/v/Dependify.Cli.svg)](https://nuget.org/packages/Dependify.Cli)                       | CLI            |
| `Dependify.Core`            | [![Nuget](https://img.shields.io/nuget/v/Dependify.Core.svg)](https://nuget.org/packages/Dependify.Core)                     | Core library (API)   |
| `Dependify.Aspire.Hosting` | [![Nuget](https://img.shields.io/nuget/v/Dependify.Aspire.Hosting.svg)](https://nuget.org/packages/Dependify.Aspire.Hosting) | Aspire support |

## Usage

Here is how to install it:

```bash
dotnet tool install -g Dependify.Cli
```

```bash
❯ dependify -h
USAGE:
    Dependify.Cli.dll [OPTIONS] <COMMAND>

EXAMPLES:
    Dependify.Cli.dll graph scan ./path/to/folder --framework net8
    Dependify.Cli.dll graph show ./path/to/project --framework net8

OPTIONS:
    -h, --help    Prints help information

COMMANDS:
    graph
    serve <path>
```

As you can see, there is a `serve` command. It starts a web server that allows you to explore the dependencies in your project using a web browser.

```bash
dependify serve $dev/path-to-folder/
```

You will see something like the following output in the terminal.

<center>
    <img src="/assets/dependify/serve-terminal.png" style="margin: 15px;" width="90%">
</center>

## Features

* **Workbench ⚙️** gives you high level overview of the dependencies in the solution and allows you to show dependencies between component in a form of a mermaid diagram. It can be a graph diagram or simple C4 component diagram.

<center>
    <video src="https://github.com/user-attachments/assets/e3eecf59-864d-4a7b-9411-60ee7a364c57" width="90%" controls="controls" />
</center>

* **Dependency Explorer 🔎**: This feature offers a more interactive user interface. It allows you to select dependencies and their descendants on-demand.

<center>
    <video src="https://github.com/user-attachments/assets/555df3ef-b0c3-4354-911f-81d4dfd07607" width="90%" controls="controls" />
</center>

My suggestion is to install the tool and try it out on your project. It can be a great help in understanding the dependencies and relationships between components. 🚀

### Aspire support

You can add `Dependify.Web` as resource to your Aspire AppHost project.

Add the package to AppHost:

```bash
dotnet add package Dependify.Aspire.Hosting
```

In the code below, I've added the `Dependify` to the Aspire starter project. (`dotnet new aspire-starter`)

Register via `IDistributedApplicationBuilder`. Add the following code to your `Program.cs`:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var apiService = builder.AddProject<Projects.aspire_project_ApiService>("apiservice");

builder.AddProject<Projects.aspire_project_Web>("webfrontend")
    .WithExternalHttpEndpoints()
    .WithReference(apiService);

builder.AddDependify().ServeFrom("../../aspire-project/"); // <-- location of .sln file

builder.Build().Run();
```

All you need to do is to add the `builder.AddDependify().ServeFrom()` to the `AppHost` and run it:

<center>
    <video src="https://github.com/user-attachments/assets/fe4a6d1e-2779-480a-aec4-9b7999cf138c" width="90%" controls="controls" />
</center>

## Conclusion

In this post, we explored the Dependify tool, which can help you navigate the dependency graph of your .NET application. By using this tool, you can visualize the dependencies between modules, identify potential issues, and gain a better understanding of your project structure.

## References

* <https://github.com/NikiforovAll/dependify>
