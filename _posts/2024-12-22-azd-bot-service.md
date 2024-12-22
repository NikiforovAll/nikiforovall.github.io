---
layout: post
title: "Deploy Your Bot to Azure in 5 Minutes with Azure Developer CLI (azd)"
categories: [ dotnet ]
tags: [ dotnet, azure, bot ]
published: true
shortinfo: "Learn how to use a starter template to deploy a bot to Azure with Azure Bot Service and Azure Developer CLI (azd)"
fullview: false
comments: true
related: true
mermaid: false
---

## TL;DR

**Source code:** <https://github.com/NikiforovAll/azd-bot-service-starter>

## Introduction

Bots are everywhere, as developers, we should embrace this trend and learn how to prototype and deploy bots quickly.

Using [Azure Developer CLI (azd)](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/), we can quickly deploy and manage our solutions. This tutorial shows you how to deploy a bot to Azure in just five minutes using a starter template.

🚀 Let's get started and deploy your bot to Azure!

## Install From Template

Since I already prepared a starter template, you can deploy a bot to Azure in just a few minutes. 

Here's how:

```bash
azd init --template https://github.com/NikiforovAll/azd-bot-service-starter
```

Here is the sneak peek of the bot that we are going to deploy:

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddNewtonsoftJson();
builder.Services.AddSingleton<IBotFrameworkHttpAdapter, AdapterWithErrorHandler>();
builder.Services.AddTransient<IBot, EchoBotHandler>();

var app = builder.Build();
app
    .UseDefaultFiles()
    .UseStaticFiles()
    .UseWebSockets()
    .UseRouting()
    .UseAuthorization();

app.MapPost(
    "/api/messages",
    async (IBotFrameworkHttpAdapter adapter, IBot bot, HttpRequest req, HttpResponse res) =>
    {
        await adapter.ProcessAsync(req, res, bot);
    }
);
app.MapHealthChecks("/health");
app.Run();
```

It's a simple echo bot that repeats the user's message back to them. Nothing special, but this is a good starting point for your bot.

```csharp
public class EchoBotHandler : ActivityHandler
{
    protected override async Task OnMessageActivityAsync(
        ITurnContext<IMessageActivity> turnContext,
        CancellationToken cancellationToken
    )
    {
        var replyText = $"Echo: {turnContext.Activity.Text}";
        await turnContext.SendActivityAsync(
            MessageFactory.Text(replyText, replyText),
            cancellationToken
        );
    }
}
```

## Run and Deploy

Now, we can create a new azd environment:

```bash
azd env new azd-bot-service-dev
```

And deploy the bot to Azure.

```bash
azd up
```

Here is the output of the deployment (it took me less than 5 minutes to deploy the bot 🤯):

<center>
  <img src="/assets/azd-bot-service-starter/azd-up.png" style="margin: 15px;" />
</center>

The `azd` CLI outputs the URL of the deployed bot. You can test it by sending a message to the bot.

<center>
  <img src="/assets/azd-bot-service-starter/test-chat.png" style="margin: 15px;" />
</center>

The benefit of using `azd` template is that it automatically creates a new resource group, app service plan, application insights, vault, and app service for you. You don't need to worry about the infrastructure, just focus on your code.

For example, here is an application insights dashboard for the bot:

<center>
  <img src="/assets/azd-bot-service-starter/app-insights.png" style="margin: 15px;" />
</center>

## Teardown

When you are done with the bot, you can delete the resources using the following command:

```bash
azd down
```

This command will delete all the resources created by the `azd up` command.

<center>
  <img src="/assets/azd-bot-service-starter/azd-down.png" style="margin: 15px;" />
</center>

## Conclusion

> 🙌 I hope you found it helpful. If you have any questions, please feel free to reach out. If you'd like to support my work, a star on GitHub would be greatly appreciated! 🙏

## References

- [awesome-azd](https://azure.github.io/awesome-azd/)
- [Azure Developer CLI - Getting Started](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/get-started)