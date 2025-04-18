---
layout: post
title: "Introducing AI DIAL: The Open-Source AI Orchestration Platform"
categories: [ dotnet, ai ]
tags: [ ai, aspire, dial, llm-orchestration ]
published: true
shortinfo: "Use AI DIAL to streamline and orchestrate Software Development Lifecycle (SDLC) for enterprise Gen AI applications. In this post, I will introduce you to the platform and its capabilities and show you how to get started with it using .NET Aspire."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

Use [AI DIAL](https://epam-rail.com/) to streamline and orchestrate Software Development Lifecycle (SDLC) for enterprise Gen AI applications. In this post, I will introduce you to the platform and its capabilities and show you how to get started with it using .NET Aspire.

**Source code:** <https://github.com/NikiforovAll/ai-dial-dotnet>

**Table of Contents**:
- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Key Features](#key-features)
- [Getting Started via .NET Aspire](#getting-started-via-net-aspire)
  - [Hosting Integration](#hosting-integration)
  - [Client Integration](#client-integration)
  - [Demo](#demo)
- [Conclusion](#conclusion)
- [References](#references)

## Introduction

AI **[DIAL](https://epam-rail.com/platform)** stands for **D**eterministic **I**ntegrator of **A**pplications and **L**anguage Models. It is an enterprise-grade, open-source AI orchestration platform that simplifies the development, deployment, and management of AI-driven applications. AI DIAL acts as both a development studio and an application server, enabling seamless integration between various AI models, data pipelines, and business applications.

See: [DIAL 2.0: The Open Source AI Orchestration Platform Overview - YouTube](https://www.youtube.com/watch?v=Ud2UyXjNK4I&list=PLhkKkML8gp_fNs5NQdztKwIr2yWnLoQfy&index=1)

<center>
  <img src="/assets/dial/arch.png" style="margin: 15px;" width="80%" />
</center>

## Key Features

* 🔗 **Models Connectivity** - provides out-of-the-box adapters for all major LLM providers, including all models hosted in Amazon Bedrock, Google's Vertex AI, and Azure OpenAI Service. Additionally, you can use language models from the open-source community, alternative vendors, and fine-tuned micro models, as well as self-hosted or models listed on HuggingFace or DeepSeek. As of now, there are over 75 ready-to-use adapters, with more being added regularly. If necessary, DIAL SDK can be used to develop adapters for additional models and vendors. [[Learn More]](https://docs.epam-rail.com/supported-models)
* 💻 **Application Server & Unified API** - provides a single Unified API, based on OpenAI API, for accessing all language models, embedding models and applications. The key design principle is to create a unification layer that allows all models and applications to be interchangeable, delivering a cohesive conversational experience and future-proof development of custom GenAI applications.[[Learn More]](https://epam-rail.com/dial_api)
* 🛠️ **Extensibility** - AI DIAL can be extended beyond its standard capabilities to meet specific business requirements. You can leverage the SDK to create custom model adapters and GenAI applications, and even include new application types to build fully custom implementations. AI DIAL Chat also enables the creation of custom chat UI components. [[Learn More]](https://epam-rail.com/extension-framework)
* 💬 **Customizable Chat & Overlay** - Powerful and highly customizable chat application for end-users, with enterprise-grade access control, extendable functionality and ability to add custom GenAI applications. Overlay enables a seamless embedding of chat into any existing web application. [[Learn More]](https://github.com/epam/ai-dial-chat?tab=readme-ov-file#dial-chat)
* ➕ **Marketplace** - Marketplace gives access to all conversational agents available within the organization. Additionally, the marketplace offers collaboration tools for users and supports Role-Based Access Control (RBAC) to streamline teamwork and ensure secure access to resources. [[Learn More]](https://docs.epam-rail.com/marketplace)

## Getting Started via .NET Aspire

Now, you know what DIAL is. Let's see how to get started with it using [.NET Aspire](https://learn.microsoft.com/en-us/dotnet/aspire/get-started/aspire-overview).

🎯 **Goal**. Let's say we want to:

1. Create DIAL installation with two models: `deepseek-r1` and `phi3`
2. Use DIAL Chat UI to interact with the models
3. Use them in our application programmatically through *DIAL Unified API*

### Hosting Integration

First, we want to add DIAL hosting integration to `AppHost` project by adding the `EPAM.Dial.Aspire.Hosting` NuGet package:

```bash
dotnet add package Nall.EPAM.Dial.Aspire.Hosting
```

Then, we need to add the DIAL hosting integration to the `AppHost/Program.cs`:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var ollama = builder
    .AddOllama("ollama")
    .WithOpenWebUI()
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent);
ollama.AddModel("ollama-deepseek-r1", "deepseek-r1:1.5b");
ollama.AddModel("ollama-phi3", "phi3.5");

var dial = builder.AddDial("dial", port: 8080).WaitFor(ollama).WithChatUI(port: 3000);

var deepseek = dial.AddModel("deepseek", deploymentName: "deepseek-r1:1.5b")
    .WithEndpoint(ollama.Resource.PrimaryEndpoint)
    .WithDisplayName("DeepSeek-R1");

var phi3 = dial.AddModel("phi3", deploymentName: "phi3.5")
    .WithEndpoint(ollama.Resource.PrimaryEndpoint)
    .WithDisplayName("Phi-3.5"); 

builder.AddProject<Projects.Api>("api").WithReference(deepseek).WithReference(phi3).WaitFor(dial);

builder.Build().Run();
```

In the example above, we are adding the DIAL hosting integration to the `AppHost` project. We are also adding two models: `ollama-deepseek-r1` and `ollama-phi3`, which are hosted on the Ollama server. We are also adding a DIAL Chat UI that will be available on port 3000.

💡 You are not limited to only self-hosted models. AI DIAL allows you to access models from all major LLM providers, language models from the open-source community, etc. See [Supported Models](https://docs.dialx.ai/platform/supported-models) for more information.

Now, we can open Aspire Dashboard and explore the component graph.

<center>
  <img src="/assets/dial/aspire-graph-demo.png" style="margin: 15px;" width="90%" />
</center>

Let's open the DIAL Chat UI and navigate to the marketplace to see the available models.

<center>
  <img src="/assets/dial/dial-marketplace.png" style="margin: 15px;" width="90%" />
</center>

Select the `deepseek` model and click on the "Use Model" button. You will be redirected to the chat UI, where you can interact with the model.

<center>
  <img src="/assets/dial/prompt-demo.png" style="margin: 15px;" width="90%" />
</center>

The *Chat UI* is pretty powerful. For example, you can compare the output of two models by using *Compare Mode*. Here you can see the output of `deepseek` and `phi3` models side by side.

<center>
  <img src="/assets/dial/compare-models-demo.png" style="margin: 15px;" width="90%" />
</center>

### Client Integration

Now, let's see how to use the *DIAL Unified API* in our application. We will use the `EPAM.Dial.Aspire` NuGet package to access the `IChatClient` implementation to trigger chat completions.

```bash
dotnet add package EPAM.Dial.Aspire
```

All we need is to add the `DialClient` to the `Api/Program.cs`:

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();

builder.AddDialOpenAIClient`("deepseek").AddChatClient(); // <--- client integration

var app = builder.Build();

app.MapGet(
    "/chat",
    async ([FromQuery] string query, [FromServices] IChatClient client) =>
    {
        var prompt = $"You are helpful assistant. Answer the following question: '{query}'";
        var response = await client.GetResponseAsync(prompt);

        return Results.Ok(response);
    }
);
app.MapDefaultEndpoints();

app.Run();
```

In the example above, we are adding the DIAL client implementation of the `IChatClient` from [Microsoft.Extensions.AI](https://www.nuget.org/packages/Microsoft.Extensions.AI) which is a standard way of integrating with LLMs in .NET.

💡 Note, it is called `AddDialOpenAIClient` because essentially, it adds [OpenAI](https://www.nuget.org/packages/OpenAI) under the hood. This is possible because completion part of the *Unified API* is compatible with the OpenAI API.

### Demo

🚀Now, let's this in action:

```bash
curl --url 'http://localhost:5181/chat?query=Test'
```

Output:

```json
{
  "messages": [
    {
      "authorName": null,
      "role": "assistant",
      "contents": [
        {
          "$type": "text",
          "text": "<think>\n\n</think>\n\nIt seems like you might be referring to a \"test\" or something related to testing, but I don’t have specific information about what you’re asking. Could you clarify your needs? Are you asking about how to perform a test, taking a test as part of an educational purpose, or something else? Let me know so I can assist you better!",
          "additionalProperties": null
        }
      ],
      "messageId": "chatcmpl-161",
      "additionalProperties": null
    }
  ],
  "responseId": "chatcmpl-161",
  "chatThreadId": null,
  "modelId": "deepseek-r1:1.5b",
  "createdAt": "2025-03-30T13:05:43+00:00",
  "finishReason": "stop",
  "usage": {
    "inputTokenCount": 16,
    "outputTokenCount": 76,
    "totalTokenCount": 92,
    "additionalCounts": {}
  },
  "additionalProperties": {
    "SystemFingerprint": "fp_ollama"
  }
}
```

## Conclusion

🙌 In this post, I have introduced you to [AI DIAL](https://epam-rail.com/), an open-source AI orchestration platform that simplifies the development, deployment, and management of AI-driven applications. I have also shown you how to get started with it using .NET Aspire.

This is just the a scratch of the surface of what you can do with DIAL. I encourage you to explore the platform and its capabilities further. Let me know if you are interested in more posts about DIAL and its features.

## References

* <https://epam-rail.com>
* <https://docs.epam-rail.com>
* <https://github.com/epam/ai-dial>
* <https://learn.microsoft.com/en-us/dotnet/aspire/get-started/aspire-overview>
