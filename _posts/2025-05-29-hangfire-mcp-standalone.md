---
layout: post
title: "Hangfire MCP Server in Standalone Mode"
categories: [ dotnet ]
tags: [ dotnet, ai, hangfire, mcp, mcp-server ]
published: true
shortinfo: "Enqueue background jobs using the Standalone Hangfire MCP server."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

Enqueue background jobs using the **Hangfire MCP server** in "standalone" mode using the .NET global tool.

**Source code:** <https://github.com/NikiforovAll/hangfire-mcp>

<center>
    <video src="https://github.com/user-attachments/assets/e6abc036-b1f9-4691-a829-65292db5b5e6"
        width="90%"
        controls="controls" />
</center>

---

In my [previous](https://nikiforovall.blog/dotnet/2025/05/25/hangfire-mcp.html) blog post, I showed you how to set up a Hangfire MCP server in a .NET application. We built Hangfire MCP from scratch, and as a prerequisite, you need to reference an assembly that contains Hangfire jobs directly in the Hangfire MCP project. This is a great approach if you want to extend the Hangfire MCP server's capabilities, but it is not very convenient if you just want to use the Hangfire MCP server to enqueue background jobs.

---

In this post, I will show you how to use the Hangfire MCP server in "standalone" mode using the .NET global tool. Here is a NuGet package that I created for this purpose: [Nall.HangfireMCP](https://www.nuget.org/packages/Nall.HangfireMCP).

Here is how to setup it as an MCP server in VSCode:

```bash
dotnet tool install --global --add-source Nall.HangfireMCP
# You can invoke the tool using the following command: HangfireMCP
# Tool 'nall.hangfiremcp' (version '1.0.0') was successfully installed.
```

All we need to do is configure the `mcp.json` file to add the Hangfire MCP server and set the environment variables to specify the Hangfire jobs assembly, the job discovery expression, and the connection string for Hangfire.

```json
{
  "servers": {
    "hangfire-mcp-standalone": {
      "type": "stdio",
      "command": "HangfireMCP",
      "args": [
        "--stdio"
      ],
      "env": {
        "HANGFIRE_JOBS_ASSEMBLY": "path/to/Jobs.dll",
        "HANGFIRE_JOBS_MATCH_EXPRESSION": "[?IsInterface && contains(Name, 'Job')]",
        "HANGFIRE_CONNECTION_STRING": "Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=hangfire"
      }
    }
  }
}
```

As a result, the jobs are dynamically loaded from the specified assembly and can be enqueued using the MCP protocol. The rules for matching job names can be specified using the `HANGFIRE_JOBS_MATCH_EXPRESSION` environment variable. For example, the expression `[?IsInterface && contains(Name, 'Job')]` will match all interfaces that contain "Job" in their name. It is a [JMESPath](https://jmespath.org/tutorial.html) expression, so you can define how to match job names according to your needs.

### Aspire (Bonus)

Here is how to use the Hangfire MCP server in Standalone Mode using Aspire:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var postgresServer = builder
    .AddPostgres("postgres-server")
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent);

var postgresDatabase = postgresServer.AddDatabase("hangfire");

builder.AddProject<Projects.Web>("server")
    .WithReference(postgresDatabase)
    .WaitFor(postgresDatabase);

var mcp = builder
    .AddProject<Projects.HangfireMCP_Standalone>("hangfire-mcp")
    .WithEnvironment("HANGFIRE_JOBS_ASSEMBLY", "path/to/Jobs.dll")
    .WithEnvironment("HANGFIRE_JOBS_MATCH_EXPRESSION", "[?IsInterface && contains(Name, 'Job')]")
    .WithReference(postgresDatabase)
    .WaitFor(postgresDatabase);

builder
    .AddMCPInspector()
    .WithSSE(mcp)
    .WaitFor(mcp);

builder.Build().Run();
```

## Conclusion

The Hangfire MCP server can be used in standalone mode to enqueue background jobs without the need to write custom code. This provides greater flexibility and ease of use, especially when you want to quickly set up a Hangfire MCP server for job processing.

## References

- <https://nikiforovall.blog/dotnet/2025/05/25/hangfire-mcp.html>
- <https://github.com/NikiforovAll/hangfire-mcp>
- [modelcontextprotocol/csharp-sdk](https://github.com/modelcontextprotocol/csharp-sdk)