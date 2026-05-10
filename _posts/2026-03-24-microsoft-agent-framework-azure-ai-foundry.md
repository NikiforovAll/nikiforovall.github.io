---
layout: post
title: "Microsoft Agent Framework — Azure AI Foundry"
categories: [ dotnet, ai ]
tags: [dotnet, microsoft-agent-framework, agents, microsoft-extensions-ai, azure]
published: true
shortinfo: "Move agents to the cloud — server-managed lifecycle, hosted tools, RAG, declarative workflows, and evaluations with Azure AI Foundry."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

This is Part 3 of the Microsoft Agent Framework series. [Part 1](/dotnet/ai/2026/03/02/microsoft-agent-framework-foundations.html) built agents locally with tools, sessions, and memory. [Part 2](/dotnet/ai/2026/03/07/microsoft-agent-framework-workflows-mcp-a2a-agui.html) wired them into workflow graphs, MCP servers, and AG-UI frontends. This post moves everything to Azure AI Foundry — same `AIAgent` / `RunAsync()` API, but now the agents live server-side with managed lifecycle, hosted tools (code interpreter, web search, file search), declarative workflows, and built-in evaluations.


**Source code:** <https://github.com/NikiforovAll/maf-getting-started>

## Introduction - Why Foundry?

Parts 1 and 2 ran everything in-process. Your app created agents, held their state in memory, and managed tool execution locally. That works for development, but production asks harder questions: where do agents live between requests? Who manages the Python sandbox for code execution? Where does the vector store run?

Azure AI Foundry answers these by moving agent lifecycle, tool execution, and data storage to the cloud. The programming model stays the same -- you still call `RunAsync()` on an `AIAgent`. The difference is what happens behind the call.

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th></th><th>MAF (local)</th><th>Azure AI Foundry</th></tr>
</thead>
<tbody>
<tr><td>Agent lifecycle</td><td>In-process only</td><td>Server-side (named + versioned)</td></tr>
<tr><td>Tools</td><td>Client-side <code>AIFunction</code></td><td>Client-side + hosted (Code, Search, Web)</td></tr>
<tr><td>Memory</td><td><code>InMemoryChatHistoryProvider</code></td><td>Managed conversations</td></tr>
<tr><td>RAG</td><td>Build your own</td><td>Hosted vector stores + <code>HostedFileSearchTool</code></td></tr>
<tr><td>Evaluation</td><td>N/A</td><td>Built-in quality + safety evaluators</td></tr>
</tbody>
</table>

To switch, you swap one package and one client:

```
#:package Microsoft.Agents.AI.AzureAI@1.0.0-rc4
#:package Azure.AI.Projects@2.0.0-beta.1
```

```ts
// Before: AzureOpenAIClient → GetChatClient → AsAIAgent
// After:
AIProjectClient aiProjectClient = new(new Uri(endpoint), new DefaultAzureCredential());
```

Everything else -- `RunAsync()`, `RunStreamingAsync()`, tools, sessions -- stays the same.

## First Foundry agent

`CreateAIAgentAsync` creates a Foundry-side agent. Foundry stores it with a name and a version number. Each call with the same name bumps the version; `GetAIAgentAsync` retrieves the latest.

```ts
AIProjectClient aiProjectClient = new(new Uri(endpoint), new DefaultAzureCredential());

// Foundry-side agent -- named, versioned, persisted in Foundry
AIAgent agent = await aiProjectClient.CreateAIAgentAsync(
    name: "FoundryBasicsAgent",
    model: deploymentName,
    instructions: "You are a friendly assistant. Keep your answers brief.");

// Non-streaming
Console.WriteLine(await agent.RunAsync("Tell me a fun fact about Azure."));

// Streaming
await foreach (var update in agent.RunStreamingAsync("Tell me a fun fact about .NET."))
{
    Console.Write(update);
}

// Cleanup
await aiProjectClient.Agents.DeleteAgentAsync(agent.Name);
```

Agent definitions are immutable after creation. To change instructions or tools, create a new version:

```ts
AIAgent v1 = await aiProjectClient.CreateAIAgentAsync(
    name: "MyAgent", model: "gpt-4o-mini",
    instructions: "You are helpful.");

AIAgent v2 = await aiProjectClient.CreateAIAgentAsync(
    name: "MyAgent", model: "gpt-4o-mini",
    instructions: "You are extremely helpful and concise.");

// Returns v2
AIAgent latest = await aiProjectClient.GetAIAgentAsync(name: "MyAgent");
```

## Observability - OpenTelemetry + Foundry traces

With Foundry agents, traces show up in two places:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th></th><th>OTEL (client-side)</th><th>Server-side (Foundry)</th></tr>
</thead>
<tbody>
<tr><td>What</td><td>Agent spans, chat calls, duration</td><td>Token counts, cost, response IDs</td></tr>
<tr><td>Where</td><td>Aspire Dashboard / any OTLP backend</td><td>Foundry Portal -> Traces tab</td></tr>
<tr><td>How</td><td><code>.UseOpenTelemetry()</code> + OTLP exporter</td><td>Automatic -- built into Foundry</td></tr>
</tbody>
</table>

The same Trace ID links both sides. You see the agent execution flow in Aspire, then jump to Foundry Portal for token counts and cost.

```ts
// OTEL setup -- exports to Aspire dashboard
using var tracerProvider = Sdk.CreateTracerProviderBuilder()
    .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("FoundryBasicsDemo"))
    .AddSource("FoundryBasicsDemo")
    .AddSource("*Microsoft.Agents.AI")
    .AddOtlpExporter()
    .Build();

// Wrap agent with telemetry
AIAgent agent = (await aiProjectClient.CreateAIAgentAsync(
    name: "FoundryBasicsAgent", model: deploymentName,
    instructions: "You are a friendly assistant."))
    .AsBuilder()
    .UseOpenTelemetry(sourceName: "FoundryBasicsDemo")
    .Build();

// Parent span groups related calls
using var activitySource = new ActivitySource("FoundryBasicsDemo");
using var activity = activitySource.StartActivity("foundry-basics-demo");

Console.WriteLine($"Trace ID: {activity?.TraceId}");

await agent.RunAsync("Tell me a fun fact about Azure.");
await agent.RunStreamingAsync("Tell me a fun fact about .NET.");
```

Print the Trace ID, then search for it in Foundry Portal to see the server-side view with token counts and cost breakdown.

## Persistent sessions

In Part 1, conversation history lived in memory and died with the process. Foundry gives you server-side conversations that persist across sessions. Store only the `conversation.Id` in your database -- Foundry keeps the full thread.

```ts
using Azure.AI.Projects.OpenAI;

// Create a server-side conversation
ProjectConversationsClient conversationsClient = aiProjectClient
    .GetProjectOpenAIClient()
    .GetProjectConversationsClient();
ProjectConversation conversation = await conversationsClient.CreateProjectConversationAsync();

// Session 1: establish context
AgentSession session1 = await agent.CreateSessionAsync(conversation.Id);
Console.WriteLine(await agent.RunAsync("My name is Alex.", session1));

// Session 2: new session, same conversation -- agent remembers
AgentSession session2 = await agent.CreateSessionAsync(conversation.Id);
Console.WriteLine(await agent.RunAsync("What's my name?", session2));
// -> "Your name is Alex."
```

<div style="max-width:700px;margin:0 auto">
<div class="mermaid">
sequenceDiagram
    participant S1 as Session 1
    participant F as Foundry Conversation
    participant S2 as Session 2
    S1->>F: "My name is Alex"
    F-->>S1: "Nice to meet you, Alex!"
    Note over F: conversation.Id stored
    S2->>F: "What's my name?"
    F-->>S2: "Your name is Alex."
</div>
</div>

The conversation is visible in the Foundry Portal too, so you can inspect the full message history without writing a single line of debugging code.

## Function tools

Same pattern as Part 1 -- define C# methods with `[Description]`, register them via `AIFunctionFactory.Create()`. The difference: Foundry stores the tool JSON schemas server-side. The client still provides the actual implementations.

```ts
[Description("Get the current time in a given timezone.")]
static string GetTime([Description("The timezone (e.g., UTC, CET)")] string timezone) =>
    $"The current time in {timezone} is {DateTime.UtcNow:HH:mm} UTC.";

AITool[] tools = [AIFunctionFactory.Create(GetTime)];

// Server stores tool schemas, client provides implementations
AIAgent agent = await aiProjectClient.CreateAIAgentAsync(
    name: "TimeAgent", model: deploymentName,
    instructions: "You are a helpful assistant with time tool.",
    tools: tools);

Console.WriteLine(await agent.RunAsync("What's the time in Kyiv?"));

// Retrieve existing agent -- must pass tools so MAF can invoke them
AIAgent existing = await aiProjectClient.GetAIAgentAsync(name: "TimeAgent", tools: tools);
Console.WriteLine(await existing.RunAsync("What time is it in UTC?"));
```

When you retrieve an agent with `GetAIAgentAsync`, the server already knows the tool schemas. But it can't invoke your C# methods -- you have to pass the `tools` array so MAF can wire up the calls.

## Hosted tools - Code Interpreter and Web Search

So far, all tools ran in your process. Hosted tools flip that -- they run server-side in Foundry's infrastructure. No local dependencies, no sandbox to manage.

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th></th><th>Client tools (Parts 1-2)</th><th>Hosted tools (Foundry)</th></tr>
</thead>
<tbody>
<tr><td>Execution</td><td>Your process</td><td>Foundry cloud sandbox</td></tr>
<tr><td>Setup</td><td>Define + implement</td><td>One-liner -- Foundry provides the runtime</td></tr>
<tr><td>Examples</td><td><code>AIFunctionFactory.Create(...)</code></td><td><code>HostedCodeInterpreterTool</code>, <code>HostedWebSearchTool</code>, <code>HostedFileSearchTool</code></td></tr>
<tr><td>Use case</td><td>Custom business logic</td><td>Python execution, web search, file search</td></tr>
</tbody>
</table>

### Code Interpreter

`HostedCodeInterpreterTool` gives the agent a Python sandbox. It writes code, Foundry runs it, and you get back the results.

```ts
AIAgent agent = await aiProjectClient.CreateAIAgentAsync(
    model: deploymentName,
    name: "MathTutor",
    instructions: "You are a math tutor. Write and run Python code to solve problems.",
    tools: [new HostedCodeInterpreterTool() { Inputs = [] }]);

AgentResponse response = await agent.RunAsync(
    "Solve x^3 - 6x^2 + 11x - 6 = 0. Show the roots.");
```

The response contains a mix of content types. Walk through them to see the full execution flow -- thinking, code, output, answer:

```ts
foreach (var content in response.Messages.SelectMany(m => m.Contents))
{
    switch (content)
    {
        case TextContent text:
            Console.WriteLine($"Text: {text.Text}");
            break;

        case CodeInterpreterToolCallContent toolCall:
            var codeInput = toolCall.Inputs?.OfType<DataContent>().FirstOrDefault();
            if (codeInput?.HasTopLevelMediaType("text") ?? false)
            {
                string code = Encoding.UTF8.GetString(codeInput.Data.ToArray());
                Console.WriteLine($"Python: {code}");
            }
            break;

        case CodeInterpreterToolResultContent toolResult:
            foreach (var output in toolResult.Outputs ?? [])
            {
                if (output is TextContent tc)
                    Console.WriteLine($"Output: {tc.Text}");
            }
            break;
    }
}
```

### Web Search

`HostedWebSearchTool` lets the agent search the web autonomously and return answers with annotated URL citations.

```ts
AIAgent agent = await aiProjectClient.CreateAIAgentAsync(
    name: "WebSearchAgent",
    model: deploymentName,
    instructions: "Search the web to answer questions accurately. Cite your sources.",
    tools: [new HostedWebSearchTool()]);

AgentResponse response = await agent.RunAsync("What are the latest features in .NET 10?");
Console.WriteLine(response.Text);

// Extract URL citations
foreach (var annotation in response.Messages
    .SelectMany(m => m.Contents)
    .SelectMany(c => c.Annotations ?? []))
{
    if (annotation.RawRepresentation is UriCitationMessageAnnotation urlCitation)
    {
        Console.WriteLine($"  - {urlCitation.Title}: {urlCitation.Uri}");
    }
}
```

## RAG via Foundry

Building RAG usually means picking an embedding model, setting up a vector database, writing a chunking pipeline, and wiring it all together. Foundry collapses that into a few API calls:

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Step</th><th>API</th><th>What happens</th></tr>
</thead>
<tbody>
<tr><td>1. Upload file</td><td><code>filesClient.UploadFile()</code></td><td>File stored in Foundry</td></tr>
<tr><td>2. Create vector store</td><td><code>vectorStoresClient.CreateVectorStoreAsync()</code></td><td>Auto-chunked + embedded</td></tr>
<tr><td>3. Create agent</td><td><code>CreateAIAgentAsync(tools: [HostedFileSearchTool])</code></td><td>Agent grounded on your data</td></tr>
<tr><td>4. Ask questions</td><td><code>agent.RunAsync()</code></td><td>Grounded answers with citations</td></tr>
<tr><td>5. Cleanup</td><td>Delete agent, vector store, file</td><td>No orphan resources</td></tr>
</tbody>
</table>

```ts
var projectOpenAIClient = aiProjectClient.GetProjectOpenAIClient();
var filesClient = projectOpenAIClient.GetProjectFilesClient();
var vectorStoresClient = projectOpenAIClient.GetProjectVectorStoresClient();

// Upload knowledge base
OpenAIFile uploaded = filesClient.UploadFile(tempFile, FileUploadPurpose.Assistants);

// Create vector store -- auto-chunks and embeds
var vectorStore = await vectorStoresClient.CreateVectorStoreAsync(
    options: new() { FileIds = { uploaded.Id }, Name = "contoso-products" });
string vectorStoreId = vectorStore.Value.Id;

// Create agent with file search grounded on the vector store
AIAgent agent = await aiProjectClient.CreateAIAgentAsync(
    model: deploymentName,
    name: "RAGAgent",
    instructions: "Answer questions using the product catalog. Cite the source.",
    tools: [new HostedFileSearchTool()
    {
        Inputs = [new HostedVectorStoreContent(vectorStoreId)]
    }]);

// Multi-turn Q&A
var session = await agent.CreateSessionAsync();
Console.WriteLine(await agent.RunAsync("What's the cheapest product?", session));
Console.WriteLine(await agent.RunAsync("Which product supports CI/CD?", session));
```

<div style="max-width:700px;margin:0 auto">
<div class="mermaid">
flowchart LR
    A[Upload File] --> B[Create Vector Store]
    B --> C[Auto-chunk + Embed]
    C --> D[Create Agent + HostedFileSearchTool]
    D --> E[RunAsync - Grounded Q&A]
</div>
</div>

## Foundry workflows

Part 2 built workflows in-process with `WorkflowBuilder` and `AddEdge()`. Foundry workflows take a different approach -- you declare the agent graph in YAML, register it server-side, and Foundry orchestrates the execution.

Here's a workflow where a storyteller writes a story and a critic reviews it:

```yaml
kind: Workflow
trigger:
  kind: OnConversationStart
  id: story_critic_workflow
  actions:
    - kind: InvokeAzureAgent
      id: storyteller_step
      conversationId: =System.ConversationId
      agent:
        name: StorytellerAgent
    - kind: InvokeAzureAgent
      id: critic_step
      conversationId: =System.ConversationId
      agent:
        name: CriticAgent
```

First create the agents, then register and run the workflow:

```ts
// Create the agents that the workflow will orchestrate
await aiProjectClient.CreateAIAgentAsync(
    name: "StorytellerAgent", model: deploymentName,
    instructions: "You are a creative storyteller. Write a short story based on the user's prompt.");

await aiProjectClient.CreateAIAgentAsync(
    name: "CriticAgent", model: deploymentName,
    instructions: "You are a literary critic. Review the story and provide constructive feedback.");

// Register workflow via raw JSON (the SDK wraps the YAML in a JSON envelope)
string escapedYaml = JsonEncodedText.Encode(workflowYaml).ToString();
string requestJson = $$"""
    {
        "definition": { "kind": "workflow", "workflow": "{{escapedYaml}}" },
        "description": "Storyteller writes a story, Critic reviews it."
    }
    """;

await aiProjectClient.Agents.CreateAgentVersionAsync(
    "StoryCriticWorkflow",
    BinaryContent.Create(BinaryData.FromString(requestJson)),
    foundryFeatures: null, options: null);

// Run with streaming
ChatClientAgent workflowAgent = await aiProjectClient.GetAIAgentAsync(
    name: "StoryCriticWorkflow");
AgentSession session = await workflowAgent.CreateSessionAsync();

ChatClientAgentRunOptions runOptions = new(
    new ChatOptions { ConversationId = conversation.Id });

await foreach (var update in workflowAgent.RunStreamingAsync(
    "Write a story about a robot who discovers music.", session, runOptions))
{
    Console.Write(update.Text);
}
```

Same `RunStreamingAsync` API as always. Foundry handles the orchestration -- each agent produces a separate message in the stream.

<div style="max-width:700px;margin:0 auto">
<div class="mermaid">
flowchart LR
    U[User Prompt] --> W[Foundry Workflow]
    W --> S[StorytellerAgent]
    S --> C[CriticAgent]
    C --> R[Streamed Response]
</div>
</div>

## Evaluations

Before shipping an agent to production, you want to know: are its answers grounded in the context you provided? Are they relevant? Coherent? Safe? Foundry's evaluation library runs all of these in a single pass.

<table class="table table-sm table-responsive table-striped table-hover">
<thead>
<tr><th>Dimension</th><th>Evaluator</th><th>What it measures</th></tr>
</thead>
<tbody>
<tr><td>Groundedness</td><td><code>GroundednessEvaluator</code></td><td>Are answers grounded in provided context?</td></tr>
<tr><td>Relevance</td><td><code>RelevanceEvaluator</code></td><td>Does the answer address the question?</td></tr>
<tr><td>Coherence</td><td><code>CoherenceEvaluator</code></td><td>Is the response well-structured and logical?</td></tr>
<tr><td>Safety</td><td><code>ContentHarmEvaluator</code></td><td>Violence, self-harm, sexual, hate content</td></tr>
</tbody>
</table>

Quality evaluators (groundedness, relevance, coherence) use an LLM as a judge. The safety evaluator uses Azure AI Foundry's content safety service -- a separate endpoint, not an LLM call.

```ts
// Evaluator LLM (the judge)
IChatClient chatClient = new AzureOpenAIClient(new Uri(openAiEndpoint), credential)
    .GetChatClient(evaluatorDeployment)
    .AsIChatClient();

// Safety evaluator needs the Foundry content safety endpoint
ContentSafetyServiceConfiguration safetyConfig = new(
    credential: credential, endpoint: new Uri(endpoint));
ChatConfiguration chatConfiguration = safetyConfig.ToChatConfiguration(
    originalChatConfiguration: new ChatConfiguration(chatClient));

// Compose all evaluators
CompositeEvaluator evaluator = new([
    new GroundednessEvaluator(),
    new RelevanceEvaluator(),
    new CoherenceEvaluator(),
    new ContentHarmEvaluator(),
]);

// Run evaluation
List<ChatMessage> messages = [new(ChatRole.User, question)];
ChatResponse chatResponse = new(new ChatMessage(ChatRole.Assistant, agentResponse.Text));

EvaluationResult result = await evaluator.EvaluateAsync(
    messages, chatResponse, chatConfiguration,
    additionalContext: [new GroundednessEvaluatorContext(context)]);

// Read scores
foreach (var metric in result.Metrics.Values)
{
    if (metric is NumericMetric n)
        Console.WriteLine($"{n.Name}: {n.Value:F1}/5 ({n.Interpretation?.Rating})");
    else if (metric is BooleanMetric b)
        Console.WriteLine($"{b.Name}: {b.Value} ({b.Interpretation?.Rating})");
}
```

Quality metrics score 0-5. Safety metrics are boolean (pass/fail). Run these in CI or as a gate before deployment -- you'll catch regressions in answer quality and safety issues before users do.

## Key takeaways

1. **`AIProjectClient.CreateAIAgentAsync()`** -- same `AIAgent` API, server-managed lifecycle with name + version semantics
2. **`.UseOpenTelemetry()` + Aspire** -- client spans correlated with Foundry server traces via shared Trace ID
3. **`ProjectConversation`** -- server-side persistent conversations, store only the ID
4. **`HostedCodeInterpreterTool` / `HostedWebSearchTool` / `HostedFileSearchTool`** -- hosted tools that run in Foundry, zero infrastructure on your side
5. **File upload + vector store + `HostedFileSearchTool`** -- RAG without managing an embedding pipeline or vector database
6. **Declarative YAML workflows** -- server-side multi-agent orchestration, same `RunStreamingAsync` API
7. **`CompositeEvaluator`** -- quality + safety scoring in a single pass before production

## Presentation

<iframe src="https://nikiforovall.github.io/maf-getting-started/03-azure-ai-foundry.html" width="100%" height="600" frameborder="0" allowfullscreen></iframe>

## References

- [MAF Documentation](https://learn.microsoft.com/en-us/agent-framework/overview)
- [MAF Samples](https://github.com/microsoft/agent-framework/tree/main/dotnet/samples)
- [Azure AI Foundry](https://ai.azure.com)
- [Azure.AI.Projects SDK](https://learn.microsoft.com/en-us/dotnet/api/overview/azure/ai.projects-readme)
- [Microsoft.Extensions.AI.Evaluation](https://learn.microsoft.com/dotnet/ai/evaluation/libraries)
- [Source code](https://github.com/NikiforovAll/maf-getting-started)
