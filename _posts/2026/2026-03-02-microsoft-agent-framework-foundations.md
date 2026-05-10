---
layout: post
title: "Microsoft Agent Framework — Foundations"
categories: [ dotnet, ai ]
tags: [dotnet, microsoft-agent-framework, agents, microsoft-extensions-ai]
published: true
shortinfo: "Build your first AI agents in .NET with MAF — from hello-world to tools, multi-turn conversations, and persistent memory."
description: "Build your first AI agents in .NET with MAF — from hello-world to tools, multi-turn conversations, and persistent memory."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

Microsoft Agent Framework (MAF) merges Semantic Kernel and AutoGen into a single, production-ready agent runtime built on `Microsoft.Extensions.AI`. This post walks through five progressive samples — creating your first agent, adding tools, composing agents, multi-turn conversations, and persistent memory — all running as single-file C# scripts with `dotnet run`.


**Source code:** <https://github.com/NikiforovAll/maf-getting-started>

## Introduction — What is MAF?

.NET had two AI agent frameworks from Microsoft: **Semantic Kernel** for enterprise orchestration and **AutoGen** for multi-agent research. Two ecosystems, overlapping goals, confusion about which to pick. MAF unifies them into one framework.

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr>
<th>Before</th>
<th>After</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Semantic Kernel</strong> — enterprise AI orchestration</td>
<td>Built on <strong>Microsoft.Extensions.AI</strong> abstractions</td>
</tr>
<tr>
<td><strong>AutoGen</strong> — multi-agent research framework</td>
<td><strong>Microsoft.Agents.AI</strong> — unified agent runtime</td>
</tr>
<tr>
<td>Two ecosystems, overlapping goals</td>
<td>Single API for single &amp; multi-agent scenarios</td>
</tr>
</tbody>
</table>

1️⃣ The architecture is layered:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Layer</th><th>Components</th></tr>
</thead>
<tbody>
<tr><td><strong>Your Application</strong></td><td>AIAgent, Tools, Sessions, Workflows</td></tr>
<tr><td><strong>Microsoft.Agents.AI</strong></td><td>Unified agent runtime</td></tr>
<tr><td><strong>Microsoft.Extensions.AI</strong></td><td><code>IChatClient</code>, <code>AIFunction</code></td></tr>
<tr><td><strong>Providers</strong></td><td>Azure OpenAI, OpenAI, Ollama, ...</td></tr>
</tbody>
</table>

2️⃣ The core concepts:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Concept</th><th>Type</th><th>Purpose</th></tr>
</thead>
<tbody>
<tr><td><strong>AIAgent</strong></td><td><code>IAIAgent</code></td><td>Core agent abstraction</td></tr>
<tr><td><strong>Tools</strong></td><td><code>AIFunction</code></td><td>Functions the agent can call</td></tr>
<tr><td><strong>Session</strong></td><td><code>AgentSession</code></td><td>Conversation state &amp; history</td></tr>
<tr><td><strong>Run</strong></td><td><code>RunAsync</code> / <code>RunStreamingAsync</code></td><td>Execute agent with input</td></tr>
<tr><td><strong>Workflow</strong></td><td><code>WorkflowBuilder</code></td><td>Multi-agent orchestration</td></tr>
</tbody>
</table>

## Your first agent

All samples use .NET 10's run-file feature — single `.cs` files with `#:package` directives, no `.csproj` needed:

```bash
export AZURE_OPENAI_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"
export AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o-mini"

dotnet run src/01-hello-agent.cs
```

Here's the full agent — 38 lines from zero to running:

```ts
#:package Microsoft.Agents.AI.OpenAI@1.0.0-rc2
#:package Azure.AI.OpenAI@2.8.0-beta.1
#:package Azure.Identity@1.18.0

using Azure.AI.OpenAI;
using Azure.Identity;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using OpenAI.Chat;

var endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT");
var deploymentName = Environment.GetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT_NAME");

AIAgent agent = new AzureOpenAIClient(new Uri(endpoint!), new DefaultAzureCredential())
    .GetChatClient(deploymentName)
    .AsAIAgent(
        new ChatClientAgentOptions
        {
            Name = "HelloAgent",
            ChatOptions = new ChatOptions
            {
                Instructions = "You are a friendly assistant. Keep your answers brief.",
                Temperature = 0.9f,
            },
        }
    );

// Non-streaming
Console.WriteLine(await agent.RunAsync("Tell me a one-sentence fun fact."));

// Streaming — process tokens as they arrive
await foreach (var update in agent.RunStreamingAsync("Tell me a one-sentence fun fact."))
{
    Console.WriteLine(update);
}
```

The pipeline is straightforward:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Step</th><th>Call</th><th>Role</th></tr>
</thead>
<tbody>
<tr><td>1</td><td><code>new AzureOpenAIClient(...)</code></td><td>Azure OpenAI provider</td></tr>
<tr><td>2</td><td><code>.GetChatClient("gpt-4o-mini")</code></td><td><code>ChatClient</code> via <code>IChatClient</code></td></tr>
<tr><td>3</td><td><code>.AsAIAgent(options)</code></td><td><code>AIAgent</code> from MAF</td></tr>
<tr><td>4</td><td><code>.RunAsync("prompt")</code></td><td>Execute and get response</td></tr>
</tbody>
</table>

`AsAIAgent()` is the key extension method. It turns any `IChatClient` into a full agent. Because it's built on `IChatClient`, you can swap the provider (Azure OpenAI, OpenAI, Ollama) without touching agent code.

## Tools — Giving agents the ability to act

### Function tools

Define a plain C# method with `[Description]` attributes and register it via `AIFunctionFactory.Create()`:

```csharp
[Description("Get the weather for a given location.")]
static string GetWeather(
    [Description("The location to get the weather for.")] string location) =>
    $"The weather in {location} is cloudy with a high of 15°C.";

AIAgent weatherAgent = client
    .GetChatClient(deploymentName)
    .AsAIAgent(
        instructions: "You are a helpful weather assistant.",
        name: "WeatherAgent",
        description: "An agent that answers weather questions.",
        tools: [AIFunctionFactory.Create(GetWeather)]
    );

Console.WriteLine(await weatherAgent.RunAsync("What is the weather like in Amsterdam?"));
```

How tool calling works:

1. **User** sends: *"What's the weather in Amsterdam?"*
2. **LLM** decides to call `GetWeather("Amsterdam")`
3. **MAF** invokes the C# method automatically
4. **Result** is fed back to the LLM
5. **LLM** generates the final answer using the tool result

The `[Description]` attributes are sent to the LLM as the tool schema — write clear, specific descriptions because that's all the model sees when deciding which tool to call.

<div style="max-width:700px;margin:0 auto">
<div class="mermaid">
sequenceDiagram
    participant U as User
    participant A as WeatherAgent
    participant T as GetWeather
    U->>A: "Weather in Amsterdam?"
    A->>T: GetWeather("Amsterdam")
    T-->>A: "cloudy, 15°C"
    A-->>U: final answer
</div>
</div>

### Agent-as-tool

Any agent can become a tool for another agent via `.AsAIFunction()`:

```ts
AIAgent orchestrator = client
    .GetChatClient(deploymentName)
    .AsAIAgent(
        instructions: "You are a helpful assistant. Use the weather agent when asked about weather.",
        tools: [weatherAgent.AsAIFunction()]
    );

Console.WriteLine(await orchestrator.RunAsync("What's the weather in Amsterdam and Paris?"));
```

The orchestrator delegates to `WeatherAgent` when it encounters weather questions. The weather agent, in turn, calls its own `GetWeather` tool for each location.

<div style="max-width:700px;margin:0 auto">
<div class="mermaid">
sequenceDiagram
    participant U as User
    participant O as Orchestrator
    participant W as WeatherAgent
    participant T as GetWeather
    U->>O: "Weather in Amsterdam and Paris?"
    O->>W: AsAIFunction()
    W->>T: GetWeather("Amsterdam")
    T-->>W: "cloudy, 15°C"
    W->>T: GetWeather("Paris")
    T-->>W: "cloudy, 15°C"
    W-->>O: combined result
    O-->>U: final answer
</div>
</div>

Each agent has its own LLM call — be mindful of latency and cost when nesting agents.

## Multi-turn conversations

Without a session, each `RunAsync` call is stateless — the agent has no memory of prior turns. `AgentSession` holds the conversation thread:

```ts
AIAgent agent = new AzureOpenAIClient(new Uri(endpoint!), new DefaultAzureCredential())
    .GetChatClient(deploymentName)
    .AsAIAgent(
        instructions: """You are a friendly assistant. Keep your answers brief.
            And always remember the information the user shares with you
            during the conversation.
            """,
        name: "ConversationAgent"
    );

AgentSession session = await agent.CreateSessionAsync();

// Turn 1 — introduce context
Console.WriteLine(await agent.RunAsync("My name is Alice and I love hiking.", session));

// Turn 2 — agent remembers from session history
Console.WriteLine(await agent.RunAsync("What do you remember about me?", session));

// Turn 3 — agent uses accumulated context
Console.WriteLine(await agent.RunAsync("Suggest a hiking destination for me.", session));
```

Under the hood, the session accumulates the full conversation and sends it with each LLM call:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Turn</th><th>Input</th><th>ChatHistory contents</th></tr>
</thead>
<tbody>
<tr><td><em>created</em></td><td>—</td><td><code>[]</code> (empty)</td></tr>
<tr><td>1</td><td><em>"My name is Alice..."</em></td><td><code>[system, user₁, assistant₁]</code></td></tr>
<tr><td>2</td><td><em>"What do you remember?"</em></td><td><code>[system, user₁, assistant₁, user₂, assistant₂]</code></td></tr>
<tr><td>3</td><td><em>"Suggest a destination"</em></td><td><code>[system, user₁, assistant₁, user₂, assistant₂, user₃, assistant₃]</code></td></tr>
</tbody>
</table>

The default provider is `InMemoryChatHistoryProvider` — zero config, but lost on process restart.

## Memory and persistence

### In-memory and serialization

The default `InMemoryChatHistoryProvider` works for single-process scenarios. For persistence across restarts, MAF provides serialization:

```csharp
AgentSession session = await agent.CreateSessionAsync();

await agent.RunAsync("My name is Alice", session);

// Serialize session to JSON
var serialized = await agent.SerializeSessionAsync(session);
Console.WriteLine($"Session serialized ({serialized.GetRawText().Length} bytes)");

// Store anywhere — database, file, Redis, blob storage

// Restore session from serialized data
var restoredSession = await agent.DeserializeSessionAsync(serialized);

// Agent remembers everything from the original session
await agent.RunAsync("Do you still remember my name?", restoredSession);
// → "Yes, your name is Alice!"
```

`SerializeSessionAsync` / `DeserializeSessionAsync` give you portable session state. Export to JSON, store it however you want, restore later.

### Custom ChatHistoryProvider

For more control, implement `ChatHistoryProvider` directly. Here's a simple file-backed provider:

```csharp
sealed class FileChatHistoryProvider(string filePath) : ChatHistoryProvider
{
    protected override ValueTask<IEnumerable<ChatMessage>> ProvideChatHistoryAsync(
        InvokingContext context, CancellationToken cancellationToken = default)
    {
        if (!File.Exists(filePath))
            return new(Enumerable.Empty<ChatMessage>());

        var json = File.ReadAllText(filePath);
        var messages = JsonSerializer.Deserialize(json, ChatHistoryJsonContext.Default.ListChatMessage) ?? [];
        return new(messages.AsEnumerable());
    }

    protected override ValueTask StoreChatHistoryAsync(InvokedContext context, CancellationToken cancellationToken = default)
    {
        List<ChatMessage> existing = [];
        if (File.Exists(filePath))
        {
            var json = File.ReadAllText(filePath);
            existing = JsonSerializer.Deserialize(json, ChatHistoryJsonContext.Default.ListChatMessage) ?? [];
        }

        existing.AddRange(context.RequestMessages);
        existing.AddRange(context.ResponseMessages ?? []);

        File.WriteAllText(path: filePath, JsonSerializer.Serialize(existing, ChatHistoryJsonContext.Default.ListChatMessage));
        return default;
    }
}
```

Wire it up via `ChatClientAgentOptions`:

```csharp
AIAgent agent = new AzureOpenAIClient(new Uri(endpoint!), new DefaultAzureCredential())
    .GetChatClient(deploymentName)
    .AsAIAgent(new ChatClientAgentOptions
    {
        Name = "PersistentAgent",
        ChatOptions = new ChatOptions
        {
            Instructions = "You are a friendly assistant. Keep your answers brief.",
        },
        ChatHistoryProvider = new FileChatHistoryProvider(filePath),
    });
```

This survives process restarts — create a new agent with the same file, and it picks up where it left off. The limitation: all sessions share the same file. Concurrent sessions will clobber each other's history.

### Session-aware ChatHistoryProvider

For per-session isolation, use `ProviderSessionState<TState>`. Each session gets its own file identified by a unique session ID:

```csharp
sealed class FileChatHistoryProvider : ChatHistoryProvider
{
    private readonly string _directory;
    private readonly ProviderSessionState<SessionState> _sessionState;

    public FileChatHistoryProvider(string directory, string? existingSessionId = null)
    {
        _directory = directory;
        _sessionState = new ProviderSessionState<SessionState>(
            _ => new SessionState(existingSessionId ?? Guid.NewGuid().ToString("N")[..8]),
            nameof(FileChatHistoryProvider));
    }

    public string GetSessionId(AgentSession? session) =>
        _sessionState.GetOrInitializeState(session).SessionId;

    protected override ValueTask<IEnumerable<ChatMessage>> ProvideChatHistoryAsync(
        InvokingContext context, CancellationToken cancellationToken = default)
    {
        var state = _sessionState.GetOrInitializeState(context.Session);
        var path = Path.Combine(_directory, $"{state.SessionId}.json");
        // ... read from session-specific file
    }

    // ... StoreChatHistoryAsync implementation similar to before, but using session-specific file

    sealed class SessionState(string sessionId)
    {
        public string SessionId { get; } = sessionId;
    }
}
```

To restore a session after restart, extract the session ID and pass it to a new provider:

```csharp
var sessionId = historyProvider.GetSessionId(session);
var restoredProvider = new FileChatHistoryProvider(historyDir, sessionId);

AIAgent agent2 = client.GetChatClient(deploymentName)
    .AsAIAgent(new ChatClientAgentOptions
    {
        ChatHistoryProvider = restoredProvider,
    });

AgentSession session2 = await agent2.CreateSessionAsync();
await agent2.RunAsync("Do you remember my name?", session2); // → "Alice"
```
## Key takeaways

1. **`AsAIAgent()`** — one extension method turns any `IChatClient` into a full agent
2. **`[Description]` + `AIFunctionFactory.Create()`** — plain C# methods become LLM-callable tools
3. **`.AsAIFunction()`** — any agent can become a tool for another agent
4. **`AgentSession`** — pass to `RunAsync` to maintain multi-turn conversation history
5. **`ChatHistoryProvider`** — the extension point for production persistence

## What's next

Part 2 covers **Workflows, MCP, and AG-UI** — orchestrating multi-agent pipelines, exposing agents as MCP servers, and streaming to frontends via the AG-UI protocol.

## Presentation

<iframe src="https://nikiforovall.github.io/maf-getting-started/01-foundations.html" width="100%" height="600" frameborder="0" allowfullscreen></iframe>

## References

- [MAF Documentation](https://learn.microsoft.com/en-us/agent-framework/overview)
- [MAF Samples](https://github.com/microsoft/agent-framework/tree/main/dotnet/samples)
- [Microsoft.Extensions.AI](https://learn.microsoft.com/dotnet/ai/)
- [Source code](https://github.com/NikiforovAll/maf-getting-started)
