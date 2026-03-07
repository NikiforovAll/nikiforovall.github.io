---
layout: post
title: "Microsoft Agent Framework — Workflows, MCP, A2A & AG-UI"
categories: [ dotnet, ai ]
tags: [ dotnet, maf, agents, microsoft-extensions-ai, microsoft-agent-framework, mcp, agui, a2a ]
published: true
shortinfo: "Chain agents into workflow graphs, turn them into MCP servers, wire up A2A discovery, and stream to frontends via AG-UI."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

This is Part 2 of the Microsoft Agent Framework series. [Part 1](/dotnet/ai/2026/03/02/microsoft-agent-framework-foundations.html) covered the basics — creating agents, tools, multi-turn conversations, and memory. This post goes further: orchestrating agents into workflow graphs, exposing them as MCP servers, enabling agent-to-agent communication via A2A, and streaming to frontends with AG-UI. All samples run as single-file C# scripts with `dotnet run`.

- [TL;DR](#tldr)
- [Introduction — From agents to systems](#introduction--from-agents-to-systems)
- [Workflows — Orchestrating agents as graphs](#workflows--orchestrating-agents-as-graphs)
  - [Function workflow](#function-workflow)
  - [Agent workflow](#agent-workflow)
  - [Composed workflow](#composed-workflow)
- [MCP Integration — Agents as servers and clients](#mcp-integration--agents-as-servers-and-clients)
  - [MCP Server](#mcp-server)
  - [MCP Client](#mcp-client)
- [A2A — Agent-to-agent communication](#a2a--agent-to-agent-communication)
  - [A2A Server](#a2a-server)
  - [A2A Client](#a2a-client)
- [AG-UI — Exposing agents to web UIs](#ag-ui--exposing-agents-to-web-uis)
  - [AG-UI Server](#ag-ui-server)
  - [AG-UI Client](#ag-ui-client)
- [Key takeaways](#key-takeaways)
- [Presentation](#presentation)
- [References](#references)

**Source code:** <https://github.com/NikiforovAll/maf-getting-started>

## Introduction — From agents to systems

Part 1 built individual agents with tools, sessions, and memory. But real systems need more: pipelines that chain agents together, protocols that expose agents to external clients, and standards that let agents discover each other.

MAF addresses this with three integration protocols:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Protocol</th><th>Who talks</th><th>Transport</th><th>Use case</th></tr>
</thead>
<tbody>
<tr><td><strong>MCP Server</strong></td><td>Client → Your Agent</td><td>stdio / HTTP</td><td>Expose agents as tools</td></tr>
<tr><td><strong>MCP Client</strong></td><td>Your Agent → Remote Tools</td><td>stdio / HTTP</td><td>Consume external tools</td></tr>
<tr><td><strong>A2A</strong></td><td>Agent → Agent</td><td>HTTP + JSON-RPC</td><td>Multi-agent orchestration</td></tr>
<tr><td><strong>AG-UI</strong></td><td>User → Agent</td><td>HTTP POST + SSE</td><td>Serve end users</td></tr>
</tbody>
</table>

MCP gives agents **tools** (both ways), A2A lets agents talk to **agents**, AG-UI connects agents to **end users**.

## Workflows — Orchestrating agents as graphs

Workflows in MAF are **directed graphs** — nodes are executors (functions or agents), edges define data flow. Three patterns cover most use cases:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Pattern</th><th>Use Case</th><th>API</th></tr>
</thead>
<tbody>
<tr><td><strong>Function Workflow</strong></td><td>Pure data transformations, no LLM</td><td><code>BindAsExecutor()</code> + <code>WorkflowBuilder</code></td></tr>
<tr><td><strong>Agent Workflow</strong></td><td>LLM-powered multi-agent pipelines</td><td><code>AgentWorkflowBuilder.BuildSequential()</code></td></tr>
<tr><td><strong>Composed Workflow</strong></td><td>Mix functions + agents in one graph</td><td><code>WorkflowBuilder</code> + <code>AddEdge()</code></td></tr>
</tbody>
</table>

The building blocks:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Building Block</th><th>API</th><th>Description</th></tr>
</thead>
<tbody>
<tr><td><strong>Executor</strong></td><td><code>Func&lt;T,R&gt;.BindAsExecutor()</code></td><td>A node in the workflow graph</td></tr>
<tr><td><strong>Edge</strong></td><td><code>builder.AddEdge(A, B)</code></td><td>Connects two executors (A → B)</td></tr>
<tr><td><strong>Output</strong></td><td><code>builder.WithOutputFrom(B)</code></td><td>Designates the final output node</td></tr>
<tr><td><strong>Run</strong></td><td><code>InProcessExecution.RunAsync()</code></td><td>Executes the workflow</td></tr>
<tr><td><strong>StreamingRun</strong></td><td><code>InProcessExecution.RunStreamingAsync()</code></td><td>Executes with streaming events</td></tr>
<tr><td><strong>Events</strong></td><td><code>ExecutorCompletedEvent</code>, <code>AgentResponseUpdateEvent</code></td><td>Emitted per completed node</td></tr>
</tbody>
</table>

### Function workflow

Bind plain C# functions as workflow executors — no LLM involved, pure data transformations:

```ts
#:package Microsoft.Agents.AI.Workflows@1.0.0-rc2

using Microsoft.Agents.AI.Workflows;

Func<string, string> uppercaseFunc = s => s.ToUpperInvariant();
var uppercase = uppercaseFunc.BindAsExecutor("UppercaseExecutor");

Func<string, string> reverseFunc = s => string.Concat(s.Reverse());
var reverse = reverseFunc.BindAsExecutor("ReverseTextExecutor");

WorkflowBuilder builder = new(uppercase);
builder.AddEdge(uppercase, reverse).WithOutputFrom(reverse);
var workflow = builder.Build();

await using Run run = await InProcessExecution.RunAsync(workflow, "Hello, World!");
foreach (WorkflowEvent evt in run.NewEvents)
{
    if (evt is ExecutorCompletedEvent executorComplete)
    {
        Console.WriteLine($"{executorComplete.ExecutorId}: {executorComplete.Data}");
    }
}
```

<div style="max-width:700px;margin:0 auto">
<div class="mermaid">
graph LR
    Input["Hello, World!"] --> U[UppercaseExecutor]
    U --> R[ReverseTextExecutor]
    R --> Output["!DLROW ,OLLEH"]
</div>
</div>

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Step</th><th>Executor</th><th>Output</th></tr>
</thead>
<tbody>
<tr><td>Input</td><td>—</td><td><code>"Hello, World!"</code></td></tr>
<tr><td>1</td><td>UppercaseExecutor</td><td><code>"HELLO, WORLD!"</code></td></tr>
<tr><td>2</td><td>ReverseTextExecutor</td><td><code>"!DLROW ,OLLEH"</code></td></tr>
</tbody>
</table>

`BindAsExecutor()` wraps any `Func<TInput, TOutput>` into a workflow node. The `TOutput` of one node must match the `TInput` of the next — the type system enforces the contract.

### Agent workflow

For LLM-powered pipelines, `AgentWorkflowBuilder.BuildSequential()` chains agents together:

```ts
var endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT");
var deploymentName = Environment.GetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT_NAME");

var chatClient = new AzureOpenAIClient(new Uri(endpoint!), new DefaultAzureCredential())
    .GetChatClient(deploymentName)
    .AsIChatClient();

AIAgent writer = chatClient.AsAIAgent(
    instructions: "You write short creative stories in 2-3 sentences.", name: "Writer"
);

AIAgent critic = chatClient.AsAIAgent(
    instructions: "You review stories and give brief constructive feedback in 1-2 sentences.", name: "Critic"
);

var agentWorkflow = AgentWorkflowBuilder.BuildSequential("story-pipeline", [writer, critic]);

List<ChatMessage> input = [new(ChatRole.User, "Write a story about a robot learning to paint.")];

await using StreamingRun agentRun = await InProcessExecution.RunStreamingAsync(agentWorkflow,input);
await agentRun.TrySendMessageAsync(new TurnToken(emitEvents: true));

string lastExecutorId = string.Empty;
await foreach (WorkflowEvent evt in agentRun.WatchStreamAsync())
{
    if (evt is AgentResponseUpdateEvent e)
    {
        if (e.ExecutorId != lastExecutorId)
        {
            lastExecutorId = e.ExecutorId;
            Console.WriteLine();
            Console.WriteLine($"[{e.ExecutorId}]:");
        }

        Console.Write(e.Update.Text);
    }
    else if (evt is WorkflowOutputEvent output)
    {
        Console.WriteLine();
    }
}
```

<div style="max-width:700px;margin:0 auto">
<div class="mermaid">
graph LR
    U[User Prompt] --> W[Writer]
    W -->|story| C[Critic]
    C -->|feedback| O[Output]
</div>
</div>

```
[Writer]:
A small robot named Pixel discovered an abandoned art studio and began
mixing colors with its mechanical fingers...

[Critic]:
The story has a charming premise. Consider adding sensory details about
how the robot perceives color differently from humans...
```

Agent workflows use `StreamingRun` + `AgentResponseUpdateEvent` — not `Run`/`NewEvents` like function workflows. The `TrySendMessageAsync(new TurnToken(emitEvents: true))` call kicks off the pipeline and enables event streaming.

### Composed workflow

Real pipelines mix deterministic and intelligent steps. Consider PII redaction:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Step</th><th>What</th><th>Why not just one?</th></tr>
</thead>
<tbody>
<tr><td><strong>Regex</strong> (function)</td><td>Mask emails — fast, 100% reliable</td><td>LLMs hallucinate, regex doesn't</td></tr>
<tr><td><strong>LLM</strong> (agent)</td><td>Rewrite text naturally</td><td>Regex can't rephrase prose</td></tr>
<tr><td><strong>Regex</strong> (function)</td><td>Validate no PII leaked</td><td>Trust but verify — deterministic check</td></tr>
</tbody>
</table>

`WorkflowBuilder` lets you compose both in a single directed graph. First, define the three executors:

```ts
var client = new AzureOpenAIClient(new Uri(endpoint!), new DefaultAzureCredential());

// Step 1: Function executor — mask emails with regex
Func<string, string> maskEmails = text =>
    Regex.Replace(text, @"[\w.-]+@[\w.-]+\.\w+", "[EMAIL_REDACTED]");
var maskExecutor = maskEmails.BindAsExecutor("MaskEmails");

// Step 2: Agent executor — wrap LLM agent call as a function executor
AIAgent rewriter = client
    .GetChatClient(deploymentName)
    .AsAIAgent(
        instructions: "You receive text with [EMAIL_REDACTED] placeholders. "
            + "Rewrite the text to sound natural while keeping all redactions intact. "
            + "Do not invent or restore any redacted information. "
            + "Return only the rewritten text.",
        name: "Rewriter"
    );
Func<string, ValueTask<string>> rewriteFunc = async text =>
{
    var response = await rewriter.RunAsync(text);
    return response.ToString();
};
var rewriteExecutor = rewriteFunc.BindAsExecutor("Rewriter");

// Step 3: Function executor — validate no emails leaked
Func<string, string> validate = text =>
{
    var leaks = Regex.Matches(text, @"[\w.-]+@[\w.-]+\.\w+");
    return leaks.Count > 0
        ? $"VALIDATION FAILED - {leaks.Count} email(s) leaked"
        : $"CLEAN - no emails detected\n\n{text}";
};
var validateExecutor = validate.BindAsExecutor("ValidateNoLeaks");
```

Sync `Func<T,R>` is auto-wrapped to `ValueTask` by the framework, while async `Func<T, ValueTask<R>>` is used for agent calls that involve I/O. Both produce the same `Executor` — the graph doesn't care.

Then wire the graph and execute:

```ts
// Build graph: mask → rewrite → validate
WorkflowBuilder builder = new(maskExecutor);
builder.AddEdge(maskExecutor, rewriteExecutor);
builder.AddEdge(rewriteExecutor, validateExecutor);
builder.WithOutputFrom(validateExecutor);
var workflow = builder.Build();

var input = """
    Hi team, please contact Alice at alice.smith@example.com for the Q3 report.
    Bob (bob.jones@corp.net) will handle the deployment.
    CC: support@acme.io for any issues.
    """;

await using Run run = await InProcessExecution.RunAsync(workflow, input);

foreach (WorkflowEvent evt in run.NewEvents)
{
    if (evt is ExecutorCompletedEvent executorComplete)
    {
        Console.WriteLine($"[{executorComplete.ExecutorId}]:");
        Console.WriteLine(executorComplete.Data);
        Console.WriteLine();
    }
}
```

<div style="max-width:700px;margin:0 auto">
<div class="mermaid">
graph LR
    I[Input text with emails] --> M[MaskEmails<br/><i>Func — regex</i>]
    M --> R[Rewriter<br/><i>AIAgent — LLM</i>]
    R --> V[ValidateNoLeaks<br/><i>Func — regex</i>]
    V --> O[Output]
</div>
</div>

```
[MaskEmails]:
Hi team, please contact Alice at [EMAIL_REDACTED] for the Q3 report.
Bob ([EMAIL_REDACTED]) will handle the deployment.
CC: [EMAIL_REDACTED] for any issues.

[Rewriter]:
Hi team, please reach out to Alice at [EMAIL_REDACTED] regarding the Q3 report.
Bob ([EMAIL_REDACTED]) will be managing the deployment.
For any issues, CC [EMAIL_REDACTED].

[ValidateNoLeaks]:
CLEAN - no emails detected
```

## MCP Integration — Agents as servers and clients

**Model Context Protocol** is an open standard for connecting AI models to external tools and data. The integration is **two-sided**:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Direction</th><th>Pattern</th><th>API</th></tr>
</thead>
<tbody>
<tr><td><strong>Agent as MCP Server</strong></td><td>Expose your agents as tools for external MCP clients (Claude Code, VS Code, etc.)</td><td><code>.AsAIFunction()</code> → <code>McpServerTool.Create()</code></td></tr>
<tr><td><strong>Agent as MCP Client</strong></td><td>Your agent discovers and calls tools from remote MCP servers</td><td><code>McpClient.CreateAsync()</code> → <code>ListToolsAsync()</code></td></tr>
</tbody>
</table>

### MCP Server

Two calls turn any agent into an MCP tool: `.AsAIFunction()` then `McpServerTool.Create()`:

```ts
var client = new AzureOpenAIClient(new Uri(endpoint!), new DefaultAzureCredential());

AIAgent joker = client
    .GetChatClient(deploymentName)
    .AsAIAgent(
        instructions: "You are good at telling jokes.",
        name: "Joker",
        description: "An agent that tells jokes on any topic."
    );

AIAgent weatherAgent = client
    .GetChatClient(deploymentName)
    .AsAIAgent(
        instructions: "You are a helpful weather assistant.",
        name: "WeatherAgent",
        description: "An agent that answers weather questions.",
        tools: [AIFunctionFactory.Create(GetWeather)]
    );

var jokerTool = McpServerTool.Create(joker.AsAIFunction());
var weatherTool = McpServerTool.Create(weatherAgent.AsAIFunction());

var builder = Host.CreateEmptyApplicationBuilder(settings: null);
builder.Services.AddMcpServer().WithStdioServerTransport().WithTools([jokerTool, weatherTool]);

await builder.Build().RunAsync();

[Description("Get the weather for a given location.")]
static string GetWeather([Description("The location to get the weather for.")] string location) =>
    $"The weather in {location} is cloudy with a high of 15°C.";
```

<div style="max-width:700px;margin:0 auto">
<div class="mermaid">
sequenceDiagram
    participant C as MCP Client<br/>(Claude Code)
    participant S as MCP Server<br/>(stdio)
    participant W as WeatherAgent
    participant T as GetWeather
    C->>S: call WeatherAgent tool
    S->>W: RunAsync(input)
    W->>T: GetWeather("Amsterdam")
    T-->>W: "cloudy, 15°C"
    W-->>S: response
    S-->>C: result
</div>
</div>

Drop a `.mcp.json` in your repo root and Claude Code / VS Code picks it up automatically:

```json
{
  "mcpServers": {
    "maf-agents": {
      "command": "dotnet",
      "args": ["run", "src/06-agent-as-mcp.cs"],
      "env": {
        "AZURE_OPENAI_ENDPOINT": "https://your-resource.cognitiveservices.azure.com/",
        "AZURE_OPENAI_DEPLOYMENT_NAME": "gpt-4o-mini"
      }
    }
  }
}
```

`dotnet run` starts the MCP server as a child process. Communication happens over **stdio** — no ports, no networking.

### MCP Client

Agents can also consume MCP tools. Here's an agent that uses Microsoft Learn's public MCP server:

```ts
var client = new AzureOpenAIClient(new Uri(endpoint!), new DefaultAzureCredential());

Console.WriteLine("Connecting to Microsoft Learn MCP...");
await using var mcpClient = await McpClient.CreateAsync(
    new HttpClientTransport(
        new()
        {
            Endpoint = new Uri("https://learn.microsoft.com/api/mcp"),
            Name = "Microsoft Learn MCP",
            TransportMode = HttpTransportMode.StreamableHttp,
        }
    ),
    loggerFactory: loggerFactory
);

Console.WriteLine("Listing tools...");
IList<McpClientTool> mcpTools = await mcpClient.ListToolsAsync();
Console.WriteLine($"Discovered {mcpTools.Count} tools:");
foreach (var tool in mcpTools)
    Console.WriteLine($"  - {tool.Name}");

AIAgent agent = client
    .GetChatClient(deploymentName)
    .AsIChatClient()
    .AsBuilder()
    .UseLogging(loggerFactory)
    .Build()
    .AsAIAgent(
        instructions: "You answer questions using Microsoft Learn documentation tools.",
        name: "DocsAgent",
        loggerFactory: loggerFactory,
        tools: [.. mcpTools.Cast<AITool>()]
    );

Console.WriteLine("Running agent...");
Console.WriteLine(await agent.RunAsync("What is Microsoft Agent Framework?"));
```

`HttpClientTransport` connects to remote MCP servers (Streamable HTTP), while `StdioClientTransport` works for local servers. The same `ListToolsAsync()` API discovers tools in both cases. Discovered `McpClientTool` instances are cast to `AITool` and passed directly as agent tools.

## A2A — Agent-to-agent communication

**Agent-to-Agent Protocol** is an open standard for agents to discover and communicate with each other over HTTP.

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th></th><th>MCP</th><th>A2A</th></tr>
</thead>
<tbody>
<tr><td><strong>Who talks</strong></td><td>Client → Tool</td><td>Agent → Agent</td></tr>
<tr><td><strong>Transport</strong></td><td>stdio / HTTP</td><td>HTTP + JSON-RPC</td></tr>
<tr><td><strong>Discovery</strong></td><td>Config file</td><td><code>/.well-known/agent-card.json</code></td></tr>
<tr><td><strong>Use case</strong></td><td>Extend agent capabilities</td><td>Multi-agent orchestration</td></tr>
</tbody>
</table>

### A2A Server

Every A2A agent publishes an `AgentCard` that clients fetch for discovery:

```ts
var client = new AzureOpenAIClient(new Uri(endpoint!), new DefaultAzureCredential());

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient().AddLogging();
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.TypeInfoResolverChain.Add(
        A2AJsonUtilities.DefaultOptions.TypeInfoResolver!
    );
    o.SerializerOptions.TypeInfoResolverChain.Add(
        A2AJsonUtilities.DefaultOptions.TypeInfoResolver!
    );
});

var app = builder.Build();

AIAgent agent = client
    .GetChatClient(deploymentName)
    .AsIChatClient()
    .AsAIAgent(
        instructions: "You are a helpful assistant.",
        name: "A2AAssistant",
        tools: [AIFunctionFactory.Create(GetWeather)]
    );

AgentCard agentCard = new()
{
    Name = "A2AAssistant",
    Description = "A helpful assistant exposed via A2A protocol.",
    Version = "1.0.0",
    DefaultInputModes = ["text"],
    DefaultOutputModes = ["text"],
    Capabilities = new() { Streaming = false },
    Skills =
    [
        new()
        {
            Id = "general",
            Name = "General Assistant",
            Description = "Answers general questions and checks weather.",
        },
    ],
};

app.MapA2A(
    agent,
    path: "/",
    agentCard: agentCard,
    taskManager => app.MapWellKnownAgentCard(taskManager, "/")
);

await app.RunAsync();

[Description("Get the weather for a given location.")]
static string GetWeather([Description("The location to get the weather for.")] string location) =>
    $"The weather in {location} is cloudy with a high of 15°C.";
```

`MapA2A()` exposes the agent over HTTP, and `MapWellKnownAgentCard()` serves the card at `/.well-known/agent-card.json`. Clients discover the agent by fetching the card — no config files, no registry needed.

### A2A Client

```ts
var host = args.Length > 0 ? args[0] : "http://localhost:5000";

A2ACardResolver resolver = new(new Uri(host));

AIAgent agent = await resolver.GetAIAgentAsync();

Console.WriteLine(await agent.RunAsync("What is the weather in Amsterdam?"));
```

**4 lines** to discover a remote agent and call it. `A2ACardResolver` fetches the agent card, constructs an `AIAgent` proxy, and you use the same `RunAsync()` interface as local agents.

## AG-UI — Exposing agents to web UIs

**Agent User Interface Protocol** connects agents to frontend UIs via HTTP POST + Server-Sent Events:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th></th><th>MCP</th><th>A2A</th><th>AG-UI</th></tr>
</thead>
<tbody>
<tr><td><strong>Who talks</strong></td><td>Client → Tool</td><td>Agent → Agent</td><td>User → Agent</td></tr>
<tr><td><strong>Transport</strong></td><td>stdio / HTTP</td><td>HTTP + JSON-RPC</td><td>HTTP POST + SSE</td></tr>
<tr><td><strong>Discovery</strong></td><td>Config file</td><td>Agent card</td><td>URL</td></tr>
<tr><td><strong>Use case</strong></td><td>Extend capabilities</td><td>Multi-agent orchestration</td><td>Serve end users</td></tr>
</tbody>
</table>

The client sends one HTTP POST, the server streams back typed SSE events:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Phase</th><th>What happens</th><th>SSE Events</th></tr>
</thead>
<tbody>
<tr><td><strong>Start</strong></td><td>Server begins processing</td><td><code>RUN_STARTED</code></td></tr>
<tr><td><strong>Text response</strong></td><td>Tokens stream to UI in real-time</td><td><code>TEXT_MESSAGE_START</code> → <code>TEXT_MESSAGE_CONTENT</code>* → <code>TEXT_MESSAGE_END</code></td></tr>
<tr><td><strong>Tool call</strong></td><td>Agent invokes a function</td><td><code>TOOL_CALL_START</code> → <code>TOOL_CALL_ARGS</code> → <code>TOOL_CALL_END</code></td></tr>
<tr><td><strong>State update</strong></td><td>Shared state syncs to client</td><td><code>STATE_SNAPSHOT</code> or <code>STATE_DELTA</code></td></tr>
<tr><td><strong>Finish</strong></td><td>Run completes</td><td><code>RUN_FINISHED</code></td></tr>
</tbody>
</table>

### AG-UI Server

```ts
var client = new AzureOpenAIClient(new Uri(endpoint!), new DefaultAzureCredential());

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient().AddLogging();
builder.Services.AddCors(o =>
    o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader())
);
builder.Services.AddAGUI();

WebApplication app = builder.Build();
app.UseCors();

AIAgent agent = client
    .GetChatClient(deploymentName)
    .AsIChatClient()
    .AsAIAgent(
        instructions: "You are a helpful assistant.",
        name: "AGUIAssistant",
        description: "A helpful assistant that can answer questions and check weather.",
        tools: [AIFunctionFactory.Create(GetWeather)]
    );

app.MapAGUI("/", agent);

await app.RunAsync();

[Description("Get the weather for a given location.")]
static string GetWeather([Description("The location to get the weather for.")] string location) =>
    $"The weather in {location} is cloudy with a high of 15°C.";
```

`AddAGUI()` registers the AG-UI JSON serialization, `MapAGUI("/", agent)` exposes the agent as an HTTP+SSE endpoint. Two calls from agent to web-ready endpoint.

### AG-UI Client

```ts
using HttpClient httpClient = new() { Timeout = TimeSpan.FromSeconds(60) };
AGUIChatClient chatClient = new(httpClient, "http://localhost:5000");

AIAgent agent = chatClient.AsAIAgent(name: "agui-client");

await foreach (AgentResponseUpdate update in agent.RunStreamingAsync(
    [new ChatMessage(ChatRole.User, "What's the weather in Amsterdam?")]))
{
    foreach (AIContent content in update.Contents)
        if (content is TextContent text)
            Console.Write(text.Text);
}
```

`AGUIChatClient` wraps `HttpClient` and speaks the AG-UI protocol. From there it's the familiar `AsAIAgent()` + `RunStreamingAsync()` pattern. The [full interactive client](https://github.com/NikiforovAll/maf-getting-started/blob/main/src/07b-agent-as-agui-client.cs) adds a Spectre.Console chat loop with session management. For richer frontend experiences, check out [CopilotKit](https://docs.copilotkit.ai/microsoft-agent-framework) or [AG-UI Dojo](https://dojo.ag-ui.com/microsoft-agent-framework-dotnet).

## Key takeaways

1. **`BindAsExecutor()`** — turn any `Func<T,R>` into a workflow node
2. **`AgentWorkflowBuilder.BuildSequential()`** — chain agents into pipelines with one call
3. **`WorkflowBuilder` + `AddEdge()`** — compose function and agent executors in a single graph
4. **`McpServerTool.Create(agent.AsAIFunction())`** — expose agents as MCP tools in two lines
5. **`MapA2A()` + `AgentCard`** — agents discover and call each other over HTTP
6. **`AddAGUI()` + `MapAGUI()`** — expose agents to web UIs via HTTP+SSE in two lines

## Presentation

<iframe src="https://nikiforovall.github.io/maf-getting-started/02-workflows.html" width="100%" height="600" frameborder="0" allowfullscreen></iframe>

## References

- [MAF Documentation](https://learn.microsoft.com/en-us/agent-framework/overview)
- [MAF Samples](https://github.com/microsoft/agent-framework/tree/main/dotnet/samples)
- [MCP C# SDK](https://github.com/modelcontextprotocol/csharp-sdk)
- [AG-UI Protocol](https://docs.ag-ui.com)
- [AG-UI in MAF](https://learn.microsoft.com/agent-framework/integrations/ag-ui/getting-started)
- [AG-UI Dojo (MAF + CopilotKit)](https://dojo.ag-ui.com/microsoft-agent-framework-dotnet)
- [A2A Protocol](https://github.com/a2aproject/A2A)
- [Source code](https://github.com/NikiforovAll/maf-getting-started)
