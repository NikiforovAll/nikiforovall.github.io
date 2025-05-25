---
layout: post
title: "Simplifying Background Job Scheduling Using Hangfire MCP Server"
categories: [ dotnet ]
tags: [ dotnet, ai, hangfire, mcp, mcp-server ]
published: true
shortinfo: "Enqueue background jobs using Hangfire MCP server."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

Enqueue background jobs using the **Hangfire MCP server**. Source code: <https://github.com/NikiforovAll/hangfire-mcp>

<center>
    <video src="https://github.com/user-attachments/assets/e6abc036-b1f9-4691-a829-65292db5b5e6"
        width="90%"
        controls="controls" />
</center>

---

## Motivation

I like Hangfire for background job processing in .NET applications. It has a simple and intuitive API, a powerful dashboard, and supports various storage options. Essentially, it provides everything I need for real-world applications that require background processing. However, sometimes I need to run a job with parameters in the background, and there isn't an easy way to do it directly from the Hangfire dashboard.

🤔 So, I had an idea to schedule Hangfire jobs through an MCP server. This is exactly the use case for an MCP server.

> MCP is an open protocol that standardizes how applications provide context to LLMs. Think of MCP like a USB-C port for AI applications. Just as USB-C provides a standardized way to connect your devices to various peripherals and accessories, MCP provides a standardized way to connect AI models to different data sources and tools.

## Setup MCP Server

If you want to set up your own *Hangfire MCP Server*, you can use the [Nall.ModelContextProtocol.Template](https://www.nuget.org/packages/Nall.ModelContextProtocol.Template) template that I shared with you in the [previous post](https://nikiforovall.github.io/dotnet/2025/04/04/mcp-template-and-aspire.html).

At a high level, you need to do the following:

1. Set up the MCP server.
2. Register `McpServerTool`.
3. Configure job discovery.
4. Connect the MCP server to Hangfire using a connection string.
5. Configure the MCP client to consume the Hangfire MCP server. For example, in VS Code, you can configure the `mcp.json` file to add your server.

## Code Deep Dive

Let's see how this whole thing is composed by reviewing the `AppHost/Program.cs` file:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var postgresServer = builder.AddPostgres("postgres-server").WithDataVolume();
var postgresDatabase = postgresServer.AddDatabase("hangfire");

builder.AddProject<Projects.Web>("server")
    .WithReference(postgresDatabase)
    .WaitFor(postgresDatabase);

var mcp = builder.AddProject<Projects.HangfireMCP>("hangfire-mcp")
    .WithReference(postgresDatabase)
    .WaitFor(postgresDatabase);

builder.AddMCPInspector().WithSSE(mcp);

builder.Build().Run();
```

In the above code, we are adding the following components:

1. **Postgres Server**: This is where Hangfire will store its data.
2. **Web Project (aka Server)**: This is the main web application that will perform background job processing.
3. **Hangfire MCP Project**: This is the MCP server that will expose Hangfire jobs as MCP commands.
4. **MCP Inspector**: This is the MCP inspector that will allow us to interact with the Hangfire MCP server. This is very useful for debugging and testing purposes.

🚀 You can clone the repository (<https://github.com/NikiforovAll/hangfire-mcp>) and run the project to see how it works.

```bash
aspire run --project ./samples/AppHost/AppHost.csproj
```

Here is how the Aspire Dashboard looks:

<center><img src="/assets/hangfire-mcp/aspire-dashboard.png" /></center>

---

From a high-level perspective, here is how it works:

<div class="mermaid">
sequenceDiagram
    participant User as User
    participant MCPHangfire as MCP Hangfire
    participant IBackgroundJobClient as IBackgroundJobClient
    participant Database as Database
    participant HangfireServer as Hangfire Server

    User->>MCPHangfire: Enqueue Job (via MCP Client)
    MCPHangfire->>IBackgroundJobClient: Send Job Message
    IBackgroundJobClient->>Database: Store Job Message
    HangfireServer->>Database: Fetch Job Message
    HangfireServer->>HangfireServer: Process Job
</div>

### Hangfire MCP Server

This project is quite straightforward. We just need to map the MCP tool to a Hangfire job and call it a day. Here is how it looks:

```csharp
[McpServerToolType]
public class HangfireTool(IHangfireDynamicScheduler scheduler)
{
    [McpServerTool(Name = "RunJob")]
    public string Run(
        [Required] string jobName,
        [Required] string methodName,
        Dictionary<string, object>? parameters = null
    )
    {
        var assembly = typeof(ITimeJob).Assembly; // <-- it should point to the assembly where your Hangfire jobs are defined.
        return scheduler.Enqueue(new(jobName, methodName, parameters), assembly);
    }
}
```

This code defines a Hangfire MCP tool that allows us to enqueue jobs using the MCP protocol. The `Run` method takes the job name, method name, and optional parameters, and enqueues the job using the `IHangfireDynamicScheduler`. The `IHangfireDynamicScheduler` is a custom scheduler that uses reflection to find the job method in the specified assembly and enqueue it.

💡 You can find the implementation of `IHangfireDynamicScheduler` in the source code of the project.

Now, you can ask GitHub Copilot to enqueue a job using something like this:

```markdown
Please run the following job: #RunJob

{
    "jobName": "HangfireJobs.ISendMessageJob",
    "methodName": "ExecuteAsync",
    "parameters": {
        "text": "Hello, MCP!"
    }
}
```

Note that in this case, we need to specify the exact job name and method name, as well as the parameters. Wouldn't it be great if we could discover the jobs by asking Copilot? Let's see how we can do that.

```csharp
[McpServerTool(Name = "ListJobs"), Description("Lists all jobs")]
[return: Description("An array of job descriptors in JSON format")]
public string ListJobs()
{
    var jobs = scheduler.DiscoverJobs(
        type => type.IsInterface && type.Name.EndsWith("Job", StringComparison.OrdinalIgnoreCase),
        typeof(ITimeJob).Assembly // <-- it should point to the assembly where your Hangfire jobs are defined.
    );

    return JsonSerializer.Serialize(jobs);
}
```

In the code above, we define a `ListJobs` method that returns a list of all jobs. The `DiscoverJobs` method uses reflection to find all jobs in the specified assembly.

The idea here is that you can define rules for job discovery that are specific to your application. In this case, we are matching interfaces that end with `Job`. In my demo application, I have two jobs defined: `ITimeJob` and `ISendMessageJob`. Here is how they look:

```csharp
public interface ITimeJob
{
    public Task ExecuteAsync();
}

public interface ISendMessageJob
{
    public Task ExecuteAsync(string text); // You can specify parameters
    public Task ExecuteAsync(Message message); // Works with complex types as well
}
```

Let's take a look at the MCP server from the MCP Inspector:

<center><img src="/assets/hangfire-mcp/inspector.png" /></center>

---

As you can see, we have a bunch of tools available in the MCP Inspector. We can list jobs, enqueue jobs, get job status by job ID, and requeue jobs. The MCP Inspector allows us to interact with the Hangfire MCP server, making it a nice way to test and debug the MCP server.

## Conclusion

Now you can easily enqueue Hangfire jobs using MCP. You can use it to schedule jobs from any MCP client, such as VS Code, or even from your own custom application. If you want to see the end-to-end demo, you can check out the video at the beginning of this post.

## References

- [modelcontextprotocol/csharp-sdk](https://github.com/modelcontextprotocol/csharp-sdk)