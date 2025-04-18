---
layout: post
title: "Composable AI with .NET Aspire: Extending DIAL Assistants with Add-Ons"
categories: [ dotnet, ai ]
tags: [ ai, aspire, dial, llm-orchestration ]
published: true
shortinfo: "Learn how to build composable AI applications with .NET Aspire and AI DIAL Addons."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

> In this post will extend *AI DIAL* with [Addons](https://docs.epam-rail.com/tutorials/quick-start-with-addon) using .NET Aspire. We will build a simple TODO Assistant that allows us to manage our TODO list using natural language.

**Source code:** <https://github.com/NikiforovAll/ai-dial-dotnet>

**Table of Contents**:

- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Build the Assistant from Scratch](#build-the-assistant-from-scratch)
  - [Add DIAL Core](#add-dial-core)
  - [Add Assistant with Addon](#add-assistant-with-addon)
  - [Deploy OpenAI Model - GPT-4o](#deploy-openai-model---gpt-4o)
  - [Run Everything Together](#run-everything-together)
- [Conclusion](#conclusion)
- [References](#references)

## Introduction

In my [previous blog post](https://nikiforovall.github.io/dotnet/ai/2025/03/30/introduction-to-dial.html), I've introduced you to **[DIAL](https://epam-rail.com/platform)**, an open-source AI orchestration platform.

*AI DIAL* promises to be an extensible platform for building and deploying AI applications. In this post, we will learn how to add **Addons** to *AI DIAL*. Addons are a powerful way to extend the functionality of your AI applications by integrating with external services or APIs.

The great thing about *DIAL Addons* is that they are based on [OpenAI GPT Actions](https://platform.openai.com/docs/actions/introduction) (aka Plugins). At their core, GPT Actions leverage [Function Calling](https://platform.openai.com/docs/guides/function-calling) to execute API calls.

In this blog, we will build a `todo-assistant` based on the official [TODO Assistant](https://github.com/openai/plugins-quickstart/) from OpenAI. This Addon will allow us to manage our TODO list using natural language commands.

In *AI DIAL*, conversational agents enable direct interactions between end-users and applications or language models via the [AI DIAL Chat](https://docs.epam-rail.com/chat-design) interface or [AI DIAL API](https://epam-rail.com/dial_api).

## Build the Assistant from Scratch

Let's create empty Aspire AppHost project:

```bash
dotnet new aspire-apphost -n AppHost -o AppHost 
```

The default `Program.cs` looks like this:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

builder.Build().Run();
```

### Add DIAL Core

📦 Let's install Aspire Host integration - [Nall.EPAM.Dial.Aspire.Hosting](https://www.nuget.org/packages/Nall.EPAM.Dial.Aspire.Hosting).

```bash
dotnet add package Nall.EPAM.Dial.Aspire.Hosting
```

Now we can add the DIAL hosting to our application. The `Program.cs` file should look like this:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var dial = builder.AddDial("dial", port: 8080).WithChatUI(port: 3000); // <--Adds DIAL and Chat UI

builder.Build().Run();
```

🚀 Now, we can use Aspire cli to run our application:

```bash
aspire run --project AppHost/AppHost.csproj
```

<center>
  <img src="/assets/dial/addon/aspire-cli-1.png" style="margin: 15px;" width="50%" />
</center>

Here is the the Aspire Dashboard:

<center>
  <img src="/assets/dial/addon/app-host-1.png" style="margin: 15px;" />
</center>

### Add Assistant with Addon

Once we deployed the DIAL Core, we can add the Addon. The Addon is a simple HTTP API that will be called by the DIAL Core when it needs to execute an action.

🐋 Here is an example of Dockerfile of  "TODO List" Addon:

```dockerfile
FROM python:3.11-alpine AS builder

RUN apk update && apk add git
RUN git clone https://github.com/openai/plugins-quickstart.git

FROM python:3.11-alpine
COPY --from=builder /plugins-quickstart /plugins-quickstart

WORKDIR /plugins-quickstart
RUN pip install -r requirements.txt

EXPOSE 5003
CMD ["python", "main.py"]
```

We will run this addon as container using Aspire:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var dial = builder.AddDial("dial", port: 8080).WithChatUI(port: 3000);

var todoAddonContainer = builder
    .AddDockerfile("todo-addon-container", contextPath: "addons", dockerfilePath: "TodoDockerfile")
    .WithHttpEndpoint(port: null, targetPort: 5003, "http");

builder.Build().Run();
```

Next, we wil register the Addon with the DIAL Core:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var dial = builder.AddDial("dial", port: 8080).WithChatUI(port: 3000);

var todoAddonContainer = builder
    .AddDockerfile("todo-addon-container", contextPath: "addons", dockerfilePath: "TodoDockerfile")
    .WithHttpEndpoint(port: null, targetPort: 5003, "http");


var todoAddon = dial.AddAddon("todo-addon")
    .WithUpstream(todoAddonContainer)
    .WithDisplayName("TODO List")
    .WithDescription("Addon that allows to manage user's TODO list.");

dial.AddAssistantsBuilder()
    .AddAssistant("todo-assistant")
    .WithPrompt(
        "You are assistant that helps to manage TODO list for the user. You can add, remove and view your TODOs."
    )
    .WithDescription(
        "The assistant that manages your TODO list. It can add, remove and view your TODOs."
    )
    .WithDisplayName("TODO Assistant")
    .WithAddon(todoAddon);

builder.Build().Run();
```

🚀 Let's run the AppHost and see the result:

```bash
aspire run --project AppHost/AppHost.csproj
```

Here is the ouput of the Aspire CLI:

<center>
  <img src="/assets/dial/addon/app-cli-2.png" style="margin: 15px;" width="50%" />
</center>

And here is the Aspire Dashboard:

<center>
  <img src="/assets/dial/addon/app-host-2.png" style="margin: 15px;" />
</center>

If you open the Chat UI, you will see the TODO Assistant:

<center>
  <img src="/assets/dial/addon/assistant-chat-demo-no-model.png" style="margin: 15px;" />
</center>

☝️ But before we can use it, we need to deploy OpenAI model that supports Function Calling.

When you open Chat UI, you will see the following message - "Not available agent selected. Please, change the agent to proceed
".

Let's fix this one.

### Deploy OpenAI Model - GPT-4o

📦 We will add [Azure OpenAI hosting integration](https://learn.microsoft.com/en-us/dotnet/aspire/azureai/azureai-openai-integration) to the AppHost:

```bash
dotnet add package Aspire.Hosting.Azure.CognitiveServices
```

Let's add model deployment to the AppHost:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var openAIApiKey = builder.AddParameter("azure-openai-api-key", secret: true);

var openai = builder
    .AddAzureOpenAI("openai")
    .ConfigureInfrastructure(infra =>
    {
        var resources = infra.GetProvisionableResources();
        var account = resources.OfType<CognitiveServicesAccount>().Single();
        account.Properties.DisableLocalAuth = false; // so we can use api key
    });
var gpt4o = openai.AddDeployment("gpt-4o", "gpt-4o", "2024-08-06");
```

Now we can register this model with the DIAL Core:

```csharp
var dial = builder.AddDial("dial", port: 8080)
    .WithChatUI(port: 3000)
    .WaitFor(gpt4o); // <-- Wait for the model to be deployed

var dialGpt4o = dial.AddOpenAIModelAdapter("dial-gpt-4o", deploymentName: "gpt-4o")
    .WithUpstream(gpt4o, openAIApiKey)
    .WithDisplayName("gpt-4o")
    .WithDescription(
        "gpt-4o is engineered for speed and efficiency. Its advanced ability to handle complex queries with minimal resources can translate into cost savings and performance."
    )
    .WithWellKnownIcon(WellKnownIcon.GPT4);
```

### Run Everything Together

And that is it! We have added the OpenAI model to our DIAL Core and we are ready to see how everything works together.

The final `Program.cs` file should look like this:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var openAIApiKey = builder.AddParameter("azure-openai-api-key", secret: true);
var openai = builder
    .AddAzureOpenAI("openai")
    .ConfigureInfrastructure(infra =>
    {
        var resources = infra.GetProvisionableResources();
        var account = resources.OfType<CognitiveServicesAccount>().Single();
        account.Properties.DisableLocalAuth = false; // so we can use api key
    });
var gpt4o = openai.AddDeployment("gpt-4o", "gpt-4o", "2024-08-06");

var dial = builder.AddDial("dial", port: 8080).WithChatUI(port: 3000);

var dialGpt4o = dial.AddOpenAIModelAdapter("dial-gpt-4o", deploymentName: "gpt-4o")
    .WithUpstream(gpt4o, openAIApiKey)
    .WithDisplayName("gpt-4o")
    .WithDescription(
        "gpt-4o is engineered for speed and efficiency. Its advanced ability to handle complex queries with minimal resources can translate into cost savings and performance."
    )
    .WithWellKnownIcon(WellKnownIcon.GPT4);

var todoAddonContainer = builder
    .AddDockerfile("todo-addon-container", contextPath: "addons", dockerfilePath: "TodoDockerfile")
    .WithHttpEndpoint(port: null, targetPort: 5003, "http");

var todoAddon = dial.AddAddon("todo-addon")
    .WithUpstream(todoAddonContainer)
    .WithDisplayName("TODO List")
    .WithDescription("Addon that allows to manage user's TODO list.");

dial.AddAssistantsBuilder()
    .AddAssistant("todo-assistant")
    .WithPrompt(
        "You are assistant that helps to manage TODO list for the user. You can add, remove and view your TODOs."
    )
    .WithDescription(
        "The assistant that manages your TODO list. It can add, remove and view your TODOs."
    )
    .WithDisplayName("TODO Assistant")
    .WithAddon(todoAddon);

builder.Build().Run();
```

🚀 Let's run the AppHost again:

```bash
aspire run --project AppHost/AppHost.csproj
```

Here is the output of the Aspire CLI:

<center>
  <img src="/assets/dial/addon/app-cli-3.png" style="margin: 15px;"  width="50%" />
</center>

And here is the the Aspire Dashboard:

<center>
  <img src="/assets/dial/addon/app-host-3.png" style="margin: 15px;" />
</center>

✨ Even more interesting is Aspire Graph Dashboard:

<center>
  <img src="/assets/dial/addon/app-host-graph-3.png" style="margin: 15px;" />
</center>

Now, if you open the Chat UI, you will see the TODO Assistant. Let's try to add some TODOs:

<center>
  <img src="/assets/dial/addon/assistant-chat-demo.png" style="margin: 15px;" />
</center>

## Conclusion

In this blog post, we have learned how to extend *AI DIAL* with Addons using .NET Aspire. We have built a simple TODO Assistant that allows us to manage our TODO list using natural language commands.
We have also learned how to deploy OpenAI model that supports Function Calling and how to integrate it with the DIAL Core.

This is just the beginning of what you can do with *AI DIAL* and Addons. You can create more complex Addons that integrate with other services or APIs, or you can create your own custom Addons that provide unique functionality.

> 🙌 I hope you found it helpful. If you have any questions, please feel free to reach out. If you'd like to support my work, a star on GitHub would be greatly appreciated! 🙏

## References

- <https://github.com/NikiforovAll/ai-dial-dotnet>
- <https://epam-rail.com>
- <https://docs.epam-rail.com>
- <https://github.com/epam/ai-dial>
- <https://platform.openai.com/docs/actions/introduction>
- <https://docs.epam-rail.com/tutorials/quick-start-with-addon>
