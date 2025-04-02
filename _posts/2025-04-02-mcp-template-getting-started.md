---
layout: post
title: "Simplifying Model Context Protocol (MCP) Server Distribution with a .NET Global Tool"
categories: [ dotnet ]
tags: [ dotnet, ai, mcp ]
published: true
shortinfo: "In this post I will show you how to use simple template to create a MCP server that can be distributed as a global tool."
fullview: false
comments: true
related: true
mermaid: true
---


<center>
  <img src="/assets/mcp/light.png" style="margin: 15px;" width="80%" />
</center>

## TL;DR

Use the `Nall.ModelContextProtocol.Template` template to create a Model Context Protocol (MCP) server that can be distributed as a global tool:

Install:

```bash
dotnet new install Nall.ModelContextProtocol.Template
```

**Source code:** <https://github.com/NikiforovAll/mcp-template-dotnet>

## Introduction

In this post, I would like to show you how you can use [.NET Global Tool](https://learn.microsoft.com/en-us/dotnet/core/tools/global-tools) to distribute your Model Context Protocol (MCP) server. I've created `dotnet new` template to support this approach and I will show you how to use it.

## Getting Started

### Install

```bash
dotnet new install Nall.ModelContextProtocol.Template
```

Verify installation:

```bash
dotnet new list mcp
# These templates matched your input: 'mcp'

# Template Name  Short Name  Language  Tags
# -------------  ----------  --------  -------------
# MCP Server     mcp-server  [C#]      dotnet/ai/mcp
```

Verify output:

```bash
dotnet new mcp-server -o MyAwesomeMCPServer -n MyAwesomeMCPServer --dry-run
# File actions would have been taken:
#   Create: MyAwesomeMCPServer\.vscode\launch.json
#   Create: MyAwesomeMCPServer\MyAwesomeMCPServer.csproj
#   Create: MyAwesomeMCPServer\Program.cs
#   Create: MyAwesomeMCPServer\Properties\launchSettings.json
#   Create: MyAwesomeMCPServer\README.md
#   Create: MyAwesomeMCPServer\appsettings.Development.json
#   Create: MyAwesomeMCPServer\appsettings.json
```

Create from template:

```bash
dotnet new mcp-server -o MyAwesomeMCPServer -n MyAwesomeMCPServer
```

Here is a content of `Program.cs`:

```csharp
using Microsoft.Extensions.Hosting;

var builder = Host.CreateApplicationBuilder(args);
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly();

await builder.Build().RunAsync();

[McpServerToolType]
public static class EchoTool
{
    [McpServerTool, Description("Echoes the message back to the client.")]
    public static string Echo(string message) => $"hello {message}";
}
```

It is a simple echo server that listens for incoming messages and responds with a greeting. You can add more tools by creating additional methods with the `[McpServerTool]` attribute. The `WithToolsFromAssembly()` method automatically registers all tools in the assembly.

### Run Locally

⚙️ Build from the project directory:

```bash
dotnet build -o Artefacts -c Release
```

🚀 Run the inspector:

```bash
npx @modelcontextprotocol/inspector -e DOTNET_ENVIRONMENT=Production dotnet "$(PWD)/Artefacts/MyAwesomeMCPServer.dll"
```

Open inspector in your browser and test the server:

<center>
  <img src="/assets/mcp/inspector-demo.png" style="margin: 15px;" />
</center>

### Distribute as .NET Tool

The basic idea behind this approach is to create a .NET tool that can be installed globally on the user's machine. This allows users to run the MCP server from anywhere without needing to specify the full path to the executable.

> 💡 Another benefit of this approach is that you can **package your MCP server as a NuGet package**, making it easy to distribute, version, and share with others.

📦 Pack from the project directory:

```bash
dotnet pack -o Artefacts -c Release
```

Install the tool globally:

```bash
dotnet tool install --global --add-source ./Artefacts MyAwesomeMCPServer
# You can invoke the tool using the following command: MyAwesomeMCPServer
# Tool 'myawesomemcpserver' (version '1.0.0') was successfully installed.
```

Now, after you installed this tool globally, you can run it from anywhere on your system. The tool will be available as `MyAwesomeMCPServer` (or `myawesomemcpserver`) in your terminal.

> 💡 You can also create local tool manifest and install specific MCP versions per manifest.

🚀 Run the inspector:

```bash
npx @modelcontextprotocol/inspector -e DOTNET_ENVIRONMENT=Production myawesomemcpserver
```

## Conclusion

I think MCP opens up a lot of fun possibilities for building AI applications. In post, I showed you how to you `mcp-server` template to make your life a little easier.

> 🙌 I hope you found it helpful. If you have any questions, please feel free to reach out. If you'd like to support my work, a star on GitHub would be greatly appreciated! 🙏

## References

- <https://github.com/NikiforovAll/mcp-template-dotnet>
- <https://www.nuget.org/packages/Nall.ModelContextProtocol.Template>
- <https://github.com/modelcontextprotocol/csharp-sdk>
- <https://learn.microsoft.com/en-us/dotnet/core/tools/global-tools>
- <https://learn.microsoft.com/en-us/dotnet/core/tools/custom-templates>