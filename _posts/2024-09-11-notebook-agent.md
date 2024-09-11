---
layout: post
title: "Using Polyglot Notebooks and Kernel Memory in Your Day-to-Day Tasks"
categories: [ dotnet, ai ]
tags: [ dotnet, semantic-kernel, kernel-memory, ai, aspire ]
published: true
shortinfo: "Learn how to use Polyglot Notebooks and Kernel Memory together to enhance your day-to-day tasks with the power of AI."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

Learn how to use Polyglot Notebooks and Kernel Memory together to enhance your day-to-day tasks with the power of AI.

- [TL;DR](#tldr)
- [Motivation](#motivation)
- [Example - 'Generate a summary of a blog'](#example---generate-a-summary-of-a-blog)
  - [Demo](#demo)
- [Anatomy of the Setup (aka `notebook-agent`)](#anatomy-of-the-setup-aka-notebook-agent)
  - [Another Example - 'Ask .NET 9 Release Notes'](#another-example---ask-net-9-release-notes)
- [Conclusion](#conclusion)
- [References](#references)

**Source code:** <https://github.com/NikiforovAll/notebook-agent>

## Motivation

[Polyglot Notebooks](https://github.com/dotnet/interactive) is a powerful tool for developers. They allow you to combine code, text, and visualizations in a single document. This makes it easy to explore data, experiment with different tasks, and share your results with others.

💡 Notebooks are a great way to bring *programmability* to your work, allowing you to use code to automate repetitive tasks, analyze data, and generate reports. AI capabilities are a great addition to that.

💡 The more you invest in notebooks, the easier it becomes for you to be productive. Your experiments are stored over time, constituting a knowledge base that you can refer to at any moment.

---

🎯 For this blog post, my goal is to show you how to work with LLMs in a notebook environment. It would be great to be able to use external sources as a context for my prompts to support my day-to-day activities.

## Example - 'Generate a summary of a blog'

Let's say you have a blog post that you want to summarize. You can use the LLM to generate a summary of the blog post. Here's how you can do it:

1. Crawl the blog post and extract the text from the HTML content.
2. Use the LLM to generate a summary of the blog post.

It turns out that the [Kernel Memory](https://github.com/microsoft/kernel-memory) takes care of it for you. All the heavy lifting is done by the `Kernel Memory`. You just need to provide the context and the prompt.

Here is the code that shows you how to do it:

```csharp
var docId = await memory.ImportWebPageAsync("https://nikiforovall.github.io/tags.html");

var answer = await memory.AskAsync("What the nikiforovall blog is about?", filter: MemoryFilters.ByDocument(docId));
```

### Demo

Here is the demo:

<center>
  <video src="https://github.com/user-attachments/assets/e57c3055-532e-4ad6-a272-83cabbba600c" controls="controls" style="margin: 15px;" width="100%"/>
</center>

Output:

```text
The nikiforovall blog, titled "N+1 Blog," focuses on topics related to programming and IT. It features a variety of posts that cover different aspects of software development, particularly within the .NET ecosystem. The blog includes discussions on modern API development, asynchronous programming, microservices, cloud computing, and tools like Keycloak for identity management. Additionally, it explores design patterns, coding stories, and practical coding techniques, making it a resource for developers looking to enhance their skills and knowledge in these areas.
```

🤔 But, how do I get an instance of `memory` you may ask? Let's see how to do it using `Testcontainers`

## Anatomy of the Setup (aka `notebook-agent`)

I have created a project called `notebook-agent`. Basically, it is a starting point that has all the necessary bits to get you started.

See: <https://github.com/NikiforovAll/notebook-agent>

Here is the structure of the project:

```text
.
├── .devcontainer
│  └── devcontainer.json
├── .gitignore
├── .vscode
│  └── extensions.json
├── README.md
└── src
  ├── OpenAiOptions.cs      - Options for OpenAI
  ├── ServiceDefaults.cs
  ├── appsettings.json      - Configuration file
  ├── playground.ipynb      - entry point (example)
  ├── ask-release-notes.ipynb   - (example)
  ├── setup-infrastructure.ipynb - PostgreSQL, pgvector
  └── setup-kernel.ipynb     - Compose Kernel Memory
```

We have a few notebooks that will help you get started. Let's start from the infrastructure bit: `setup-infrastructure.ipynb`

```csharp
// setup-infrastructure.ipynb

using Testcontainers.PostgreSql;
using Npgsql;

var db = new PostgreSqlBuilder()
  .WithImage("pgvector/pgvector:pg16")
  .WithPortBinding(5432, 5432)
  .WithDatabase("memory-db")
  .WithUsername("postgres")
  .WithPassword("postgres")
  .WithReuse(true)
  .WithVolumeMount("memory-db-volume", "/var/lib/postgresql/data")
  .Build();

await db.StartAsync();

var connectionString = db.GetConnectionString();
```

In the code above, we are using `Testcontainers` to start a PostgreSQL instance with the `pgvector` extension. The `pgvector` extension is used to store the embeddings of the documents. The embeddings are used to search for the most relevant documents based on the context.

Once the infrastructure is ready, let's see how to configure the `Kernel Memory`: `setup-kernel.ipynb`

```csharp
// setup-kernel.ipynb

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.KernelMemory;
using Microsoft.KernelMemory.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

HostApplicationBuilder builder = Host.CreateApplicationBuilder();

var textGenerationOpetions = builder.Configuration // configured in appsettings.json
  .GetSection("TextGeneration")
  .Get<OpenAiOptions>();

var textEmbeddingOptions = builder.Configuration // configured in appsettings.json
  .GetSection("TextEmbeddingGeneration")
  .Get<OpenAiOptions>();

builder.Services.AddKernelMemory<MemoryServerless>(memoryBuilder =>
{
  memoryBuilder
    .WithPostgresMemoryDb(new() 
      {
        ConnectionString = builder.Configuration.GetConnectionString("memory-db")! // connection string to the PostgreSQL
      }
    )
    .WithSemanticKernelTextGenerationService( // text completion
      new AzureOpenAIChatCompletionService(
        deploymentName: textGenerationOpetions.Deployment,
        endpoint: textGenerationOpetions.Endpoint,
        apiKey: textGenerationOpetions.ApiKey
      ),
      new SemanticKernelConfig()
    )
    .WithSemanticKernelTextEmbeddingGenerationService( // text embedding
      new AzureOpenAITextEmbeddingGenerationService(
        deploymentName: textEmbeddingOptions.Deployment,
        endpoint: textEmbeddingOptions.Endpoint,
        apiKey: textEmbeddingOptions.ApiKey
      ),
      new SemanticKernelConfig()
    );
});

IHost host = builder.Build();

IKernelMemory memory = host.Services.GetRequiredService<IKernelMemory>();
IServiceProvider services = host.Services;
```

🚀 Now, we have an the instance *Kernel Memory* named - `memory`. Just run the import command from a notebook: `#!import ./setup-kernel.ipynb`

### Another Example - 'Ask .NET 9 Release Notes'

For example, assume we want to be able to chat with LLM about the *latest release of .NET 9*. Here is how to do it:

1. Create a new notebook: `ask-release-notes.ipynb`
2. Import the `setup-kernel.ipynb` notebook
3. Index of the release notes
4. Ask the question

1️⃣ Index release notes:

```csharp
var tags = new TagCollection() { ["release"] = [".NET 9","RC1"] }; // tagging provides additional information, improves search results

var librariesReleaseNotes = "https://raw.githubusercontent.com/dotnet/core/main/release-notes/9.0/preview/rc1/libraries.md";
var aspnetCoreReleaseNotes = "https://raw.githubusercontent.com/dotnet/core/main/release-notes/9.0/preview/rc1/libraries.md";

Task[] tasks = [
  memory.ImportWebPageAsync(librariesReleaseNotes, tags: tags),
  memory.ImportWebPageAsync(aspnetCoreReleaseNotes, tags: tags),
];
await Task.WhenAll(tasks);
```

2️⃣ Ask the question:

```csharp
var answer = await memory.AskAsync("What are the latest additions to .NET 9 release?", minRelevance: 0.80);

answer.Result.DisplayAs("text/markdown");
```

Here is the output:

<center>
  <img src="/assets/notebook-agent/ask-release-notes-demo.png" style="margin: 15px;" width="100%">
</center>

## Conclusion

In this post, we have seen how to use Polyglot Notebooks and Kernel Memory together to empower your day-to-day tasks with the power of AI. We have seen how to set up the infrastructure using `Testcontainers` and how to configure the `Kernel Memory` to use the LLM.

> 🙌 I hope you found it helpful. If you have any questions, please feel free to reach out. If you'd like to support my work, a star on GitHub would be greatly appreciated! 🙏

## References

- [Source Code: notebook-agent](https://github.com/NikiforovAll/notebook-agent)
- [Semantic Kernel](https://github.com/microsoft/semantic-kernel)
- [Kernel Memory](https://github.com/microsoft/kernel-memory)
- [.NET Interactive](https://github.com/dotnet/interactive)
- [Testcontainers](https://testcontainers.com/modules/?language=dotnet)