---
layout: post
title: "Simplifying Model Context Protocol (MCP) Server Development with Aspire"
categories: [ dotnet ]
tags: [ dotnet, aspire, mcp, mcp-server ]
published: true
shortinfo: "Learn how to develop MCP servers with Aspire."
fullview: false
comments: true
related: true
mermaid: true
---

<center>
  <img src="/assets/mcp/light.png" style="margin: 15px;" width="80%" />
</center>

## TL;DR

- [TL;DR](#tldr)
- [Introduction](#introduction)
- ['Stdio' Mode](#stdio-mode)
- ['SSE' Mode](#sse-mode)
- [Stdio vs SSE](#stdio-vs-sse)
- [Conclusion](#conclusion)
- [References](#references)

You can use `Nall.ModelContextProtocol.Inspector.Aspire.Hosting` hosting integration to run *MCP Inspector* and integrate it with your MCP Servers using Aspire.

**Source code:** <https://github.com/NikiforovAll/mcp-template-dotnet>

## Introduction

This blog will be in a form of tutorial, we will build a simple `echo` MCP server by using `Nall.ModelContextProtocol.Template` template that I've shared with you in the [previous post](https://nikiforovall.github.io/dotnet/2025/04/02/mcp-template-getting-started.html).

🚀 Let's get started. I want to demonstrate two ways (aka *Transports*) to run the MCP server: `stdio` and `sse`.

But first, let's create `Aspire` project.

➕ Create AppHost:

```bash
dotnet new aspire-apphost -n AppHost -o AppHost
```

📦 Install `Nall.ModelContextProtocol.Inspector.Aspire.Hosting` [package](https://www.nuget.org/packages/Nall.ModelContextProtocol.Inspector.Aspire.Hosting):

```bash
dotnet add ./Apphost package Nall.ModelContextProtocol.Inspector.Aspire.Hosting
```

📦 As in my previous post, let's install `Nall.ModelContextProtocol.Aspire.Template` [package](https://www.nuget.org/packages/Nall.ModelContextProtocol.Template):

```bash
dotnet new install Nall.ModelContextProtocol.Template
# These templates matched your input: 'mcp'

# Template Name   Short Name      Language  Tags
# --------------  --------------  --------  -------------
# MCP Server      mcp-server      [C#]      dotnet/ai/mcp
# MCP Server SSE  mcp-server-sse  [C#]      dotnet/ai/mcp
```

## 'Stdio' Mode

➕Create an MCP server:

```bash
 dotnet new mcp-server -o MyAwesomeMCPServer -n MyAwesomeMCPServer
```

🔗 Add project reference to AppHost:

```bash
dotnet add ./AppHost/AppHost.csproj reference ./MyAwesomeMCPServer/MyAwesomeMCPServer.csproj
```

In `Program.cs` of the AppHost, add the following code:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

builder.AddMCPInspector().WithStdio<Projects.MyAwesomeMCPServer>();

builder.Build().Run();
```

It runs [@modelcontextprotocol/inspector](https://www.npmjs.com/package/@modelcontextprotocol/inspector) under the hood. It is an MCP proxy that allows you to test and debug MCP servers.

💡 **Note:** The *Inspector* is responsible for starting the .NET project. So, no corresponding Aspire Resource will be available on the dashboard for the 'Stdio' mode.

<center>
  <img src="/assets/mcp/stdio-demo-dashboard.png" style="margin: 15px;" />
</center>

Open <http://127.0.0.1:6274> in your browser and click "Connect.". Now, you can test the server using the *Inspector* tool.

<center>
  <img src="/assets/mcp/stdio-demo-inspector.png" style="margin: 15px;" />
</center>

## 'SSE' Mode

Let's generate a new MCP server using the `sse` transport. You can learn more about MCP transports here - <https://modelcontextprotocol.io/docs/concepts/transports>

➕ Create a new MCP server:

```bash
dotnet new mcp-server-sse -o MyAwesomeMCPServerSSE -n MyAwesomeMCPServerSSE
```

🔗 Add project reference to AppHost:

```bash
dotnet add ./AppHost/AppHost.csproj reference ./MyAwesomeMCPServerSSE/MyAwesomeMCPServerSSE.csproj
```

In `Program.cs` of the AppHost, add the following code:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var mcp = builder.AddProject<Projects.MyAwesomeMCPServerSSE>("server"); // NOTE, for SSE mode it's a separate project
builder.AddMCPInspector().WithSSE(mcp);

builder.Build().Run();
```

The Aspire Dashboard looks slightly different for the `sse` mode. Because, this approach creates a separate `Aspire.Hosting.ApplicationModel.ProjectResource` with an exposed `/sse` endpoint. This endpoint allows you to seamlessly connect to the MCP server using the *Inspector* tool.

<center>
  <img src="/assets/mcp/sse-demo-dashboard.png" style="margin: 15px;" />
</center>

Open <http://127.0.0.1:6274> in your browser and click "Connect.". Now, you can test the server using the *Inspector* tool.

<center>
  <img src="/assets/mcp/sse-demo-inspector.png" style="margin: 15px;" />
</center>

⚠️ As for now, it is not possible to specify `sse` endpoint in the *Inspector* command line to automatically configure *MCP Inspector*. I plan to extend the Aspire integration when the feature will be implemented - [modelcontextprotocol/inspector/issues/239](https://github.com/modelcontextprotocol/inspector/issues/239). For now, you have to configure the *Inspector* manually if you divert from standard configuration.

## Stdio vs SSE

I demonstrated two approaches to running MCP servers. Personally, I favor the `sse` mode due to its transparency and ease of troubleshooting. For instance, you can launch an MCP server with a debugger attached or view the output logs directly. In contrast, the `stdio` mode relies on the *Inspector* to start the server, which disables logging on the MCP server to maintain compatibility with the *Inspector*.

## Conclusion

I hope this blog post has provided you with a clear way to start building your own MCP servers using the `Aspire` hosting integration.

> 🙌 I hope you found it helpful. If you have any questions, please feel free to reach out. If you'd like to support my work, a star on GitHub would be greatly appreciated! 🙏

## References

- <https://github.com/NikiforovAll/mcp-template-dotnet>
- <https://nikiforovall.github.io/dotnet/2025/04/02/mcp-template-getting-started.html>
- <https://modelcontextprotocol.io/docs/concepts/transports>
