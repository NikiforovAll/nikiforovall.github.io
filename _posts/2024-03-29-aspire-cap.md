---
layout: post
title: "Transactional Outbox in .NET Cloud Native Development via Aspire"
categories: [ dotnet, aspnetcore, aspire ]
tags: [ dotnet, aspnetcore, aspire, miscroservices ]
published: false
shortinfo: This post provides an example of the Outbox pattern implementation using Aspire, DotNetCore.CAP, Azure Service Bus, Azure SQL, Bicep, and azd.
fullview: false
comments: true
related: false
mermaid: true
---

*Table of Contents*:
- [TLDR](#tldr)
- [Introduction to Outbox Pattern](#introduction-to-outbox-pattern)
- [Implementation of the Outbox Pattern](#implementation-of-the-outbox-pattern)
  - [Introduction to `DotNetCore.CAP`](#introduction-to-dotnetcorecap)
  - [Example](#example)
- [Adding `Aspire`](#adding-aspire)
  - [Provision Infrastructure](#provision-infrastructure)
- [Demo](#demo)
  - [Locally](#locally)
  - [Azure](#azure)
- [Conclusion](#conclusion)
- [References](#references)

## TLDR

This post provides an example of the Outbox pattern implementation using **Aspire**, **DotNetCore.CAP**, **Azure Service Bus**, **Azure SQL**, **Bicep**, and **azd**.

> Source code: <https://github.com/NikiforovAll/cap-aspire>

## Introduction to Outbox Pattern

The **Outbox pattern** is a crucial component in the world of distributed systems. As we move towards a more distributed and decoupled architecture in modern software development, ensuring reliable message delivery becomes increasingly important.

In a distributed system, different components need to communicate with each other, often through asynchronous messaging. The **Outbox pattern** provides a reliable way to handle these messages. It ensures that even if a system fails after performing a local transaction but before sending out the message, the message is not lost. Instead, it is temporarily stored in an "outbox" and can be retrieved and sent when the system recovers.

By using the **Outbox pattern**, we can ensure that all components of the system receive the necessary messages in a reliable manner, thereby maintaining the integrity and consistency of the entire system.

In a distributed system without the **Outbox pattern**, there are several things that could go wrong, leading to data inconsistency or message loss. Here are a few examples:

1. **Transaction Commit and Message Send are not Atomic**: In a typical scenario, a service might first commit a transaction to its database and then send a message to a message broker. If the service crashes after the transaction commit but before the message is sent, the message will be lost. Other services will not be aware of the changes that were committed to the database.
2. **Message Send Failure**: Even if the service doesn't crash, sending the message could fail due to a network issue or a problem with the message broker. If the message send operation is not retried, the message will be lost.
3. **Duplicate Messages**: If the service retries the message send operation after a failure, it could end up sending the same message multiple times if the first send actually succeeded but the acknowledgement was lost. This could lead to duplicate processing if the message consumers are not idempotent.
4. **Ordering Issues:** If multiple messages are sent as a result of a single transaction, and the sends are not atomic, then the messages could be received out of order. This could lead to incorrect processing if the order of the messages is important.

The **Outbox pattern** addresses these issues by ensuring that the transaction commit and the message send operations are atomic, and by providing a mechanism for reliably sending messages even in the face of failures.

Here is a sequence diagram that illustrates the problem with a system without the **Outbox pattern**:

<div class="mermaid">

sequenceDiagram
    participant A as Component A
    participant DB as Database
    participant MB as Message Broker
    participant B as Component B
    A->>DB: Transaction
    Note right of DB: Transaction is committed
    DB-->>A: Acknowledgement
    Note left of A: A crashes after transaction is committed but before message is delivered
    A--xMB: Message crash
    Note right of MB: Message delivery fails due to A's crash
</div>

**Idempotent consumers** play a significant role in the Outbox pattern. In the context of distributed systems, idempotency refers to the ability of a system to produce the same outcome, regardless of how many times a particular operation is performed. This is crucial in ensuring data consistency and reliability in a distributed environment.

However, this could potentially lead to the same message being delivered more than once, especially in scenarios where the system fails after sending the message but before it could mark the message as sent in the outbox. This is where idempotent consumers come into play.

**Idempotent consumers** are designed to handle duplicate messages gracefully. They ensure that the side effects of receiving the same message more than once are eliminated. This is typically achieved by keeping track of the IDs of all processed messages. When a message is received, the consumer checks if it has already processed a message with the same ID. If it has, it simply ignores the message.

Here is a sequence diagram that illustrates how the Outbox pattern solves the problem:

<div class="mermaid">

sequenceDiagram
    participant A as Component A
    participant DB as Database
    participant OB as Outbox
    participant MB as Message Broker
    participant B as Component B
    A->>DB: Transaction
    A->>DB: Message
    Note right of DB: Message is stored in Database
    DB-->>A: Acknowledgement
    Note right of DB: Transaction is committed
    Note left of A: A crashes after transaction is committed but before message is delivered
    A--xMB: Message
    Note right of MB: Message delivery fails due to A's crash
    loop Every X time
        OB-->>DB: Check
        Note over OB: Outbox polls Database for new messages
        OB-->>MB: Message
        Note right of MB: Message is delivered to Message Broker
    end
    MB-->>B: Message
    Note right of B: Message is processed by Component B
    Note over B: If B has already processed a message with the same ID, it simply ignores the message (Idempotent Consumer)
</div>

## Implementation of the Outbox Pattern

Now that you understand the importance and benefits of the Outbox pattern, let's delve into what it takes to implement:

The implementation of the Outbox pattern involves the following steps:

1. **Create an Outbox Table**: The first step is to create an Outbox table in your database. This table will store all the messages that need to be sent. Each message should have a unique ID and a status field that indicates whether the message has been sent or not.
2. **Modify the Application Code**: The next step is to modify your application code. Whenever your application needs to send a message as part of a transaction, it should add the message to the Outbox table as part of the same transaction.
3. **Implement an Outbox Publisher**: The Outbox publisher is a separate component that polls the Outbox table for unsent messages. When it finds an unsent message, it sends the message and updates the status of the message in the Outbox table to 'sent'.

### Introduction to `DotNetCore.CAP`

Luckily, there is a .NET library called [DotNetCore.CAP](https://cap.dotnetcore.xyz/) that simplifies the implementation of the Outbox pattern for us.

`DotNetCore.CAP` is an open-source library that provides a set of APIs that allow developers to easily send messages as part of a database transaction, store them in an outbox, and ensure they are reliably delivered to all interested consumers, even in the face of failures.

The library also supports idempotent consumers, which are crucial for ensuring data consistency and reliability in a distributed environment. This means that even if the same message is delivered more than once, the side effects of receiving the same message are eliminated.

By using `DotNetCore.CAP`, developers can focus on the business logic of their applications, while the library takes care of the complexities of ensuring reliable message delivery in a distributed system.

### Example

This code demonstrates how to use the CAP library in an ASP.NET Core application for event publishing and handling.

In the producer:

- A route handler for the **"/send"** endpoint is defined.
- It starts a transaction, executes a SQL command to get the current server time, and publishes a message with this time to the **"test.show.time"** topic.
- The message is published with a delay of 500 milliseconds.
- If all operations are successful, the transaction is committed and a response is returned.

```csharp
// Producer/Program.cs
app.MapGet("/send", async (
    SqlConnection connection,
    ICapPublisher capPublisher,
    TimeProvider timeProvider) =>
{
    var startTime = timeProvider.GetTimestamp();
    using var transaction = connection
        .BeginTransaction(capPublisher, autoCommit: false);

    var command = connection.CreateCommand();
    command.Transaction = (SqlTransaction)transaction;
    command.CommandText = "SELECT GETDATE()";
    var serverTime = await command.ExecuteScalarAsync();

    await capPublisher.PublishDelayAsync(
        TimeSpan.FromMilliseconds(500),
        "test.show.time",
        new MyMessage(serverTime?.ToString()!));

    transaction.Commit();

    return TypedResults.Ok(new
    {
        Status = "Published",
        Duration = timeProvider.GetElapsedTime(startTime)
    });
});
```

💡Note, `BeginTransaction` is an extensions method defined in `DotNetCore.CAP.SqlServer`. It responsible for Outbox table management.

```csharp
public static IDbTransaction BeginTransaction(
    this IDbConnection dbConnection,
    ICapPublisher publisher,
    bool autoCommit = false)
```

In the consumer:

- A class `SampleSubscriber` is defined that implements `ICapSubscribe`.
- It has a method `HandleAsync` that is decorated with the `CapSubscribe` attribute, specifying it as a handler for the **"test.show.time"** topic.
- When a message is received on this topic, it logs the message content after a delay of 300 milliseconds.

```csharp
// Consumer/Program.cs
public class SampleSubscriber(
    TimeProvider timeProvider,
    ILogger<SampleSubscriber> logger) : ICapSubscribe
{
    public record MyMessage(string CreatedAt);
    
    [CapSubscribe("test.show.time")]
    public async Task HandleAsync(MyMessage message)
    {
        await Task.Delay(TimeSpan.FromMilliseconds(300), timeProvider);
        
        logger.LogInformation("Message received: {CreatedAt}", message.CreatedAt);
    }
}
```

## Adding `Aspire`

To fully demonstrate the demo, we need to setup some real infrastructure components - Message Broker and Database.

.NET Aspire provides a curated suite of NuGet packages (Components) specifically selected to facilitate the integration of cloud-native applications. Each component furnishes essential cloud-native functionalities through either automatic provisioning or standardized configuration patterns.

The .NET Aspire Service Bus component handles the following concerns to connect your app to Azure Service Bus. It adds `ServiceBusClient` to the DI container for connecting to Azure Service Bus.

```csharp
dotnet add package Aspire.Azure.Messaging.ServiceBus --prerelease
```

.NET Aspire provides two built-in configuration options to streamline SQL Server deployment on Azure:

1. Provision a containerized SQL Server database using Azure Container Apps
2. Provision an Azure SQL Database instance (We will go with this one)

```csharp
dotnet add package Aspire.Microsoft.Data.SqlClient --prerelease
```

Here is we can setup Aspire Host based on installed components:

```csharp
// CapExample.AppHost/Program.cs
var builder = DistributedApplication.CreateBuilder(args);

var sqlServer = builder.ExecutionContext.IsPublishMode
    ? builder.AddSqlServer("sqlserver").PublishAsAzureSqlDatabase().AddDatabase("sqldb")
    : builder.AddConnectionString("sqldb");

var serviceBus = builder.ExecutionContext.IsPublishMode
    ? builder.AddAzureServiceBus("serviceBus")
    : builder.AddConnectionString("serviceBus");

builder.AddProject<Projects.Consumer>("consumer")
    .WithReference(sqlServer)
    .WithReference(serviceBus);

builder.AddProject<Projects.Producer>("producer")
    .WithReference(sqlServer)
    .WithReference(serviceBus);

builder.Build().Run();
```

The idea is to use connection strings during development time and provision Azure resources on publish time.

Aspire allows us to develop locally and deploy to the cloud without source code changes by providing a flexible configuration system. We can use connection strings managed by Aspire Components, which can be easily switched between local development and cloud deployment environments. This allows us to seamlessly transition between different deployment scenarios without modifying our source code.

Down below you can find how to configure `DotNetCore.CAP` based on Aspire Components:

```csharp
// Consumer/Program.cs
// Producer/Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddAzureServiceBus("serviceBus");
builder.AddSqlServerClient("sqldb");

builder.Services.AddCap(x =>
{
    var dbConnectionString = builder.Configuration.GetConnectionString("sqldb")!;
    var serviceBusConnection = builder.Configuration.GetConnectionString("serviceBus")!;

    x.UseAzureServiceBus(serviceBusConnection);
    x.UseSqlServer(x => x.ConnectionString = dbConnectionString);
});
```

### Provision Infrastructure

The Azure Developer CLI (`azd`) has been enhanced to support the deployment of .NET Aspire applications. The `azd init` workflow offers tailored support for .NET Aspire projects. I utilized this approach while developing this application and it proved to be quite nice. It improved by productivity.

When `azd` targets a .NET Aspire application it starts the AppHost with a special command (`dotnet run --project AppHost.csproj -- --publisher manifest`), which produces the Aspire manifest file.

The manifest file is interrogated by the `azd provision` sub-command logic to generate Bicep files in-memory only (by default).

![azd-internals](/assets/cap-aspire/azd-internals.png)

See <https://learn.microsoft.com/en-us/dotnet/aspire/deployment/azure/aca-deployment-azd-in-depth?tabs=linux#how-azure-developer-cli-integration-works> for more instructions.

Personally, I find it more convenient to generate Bicep files explicitly. This can be accomplished by executing the following command:

```bash
azd infra synth
```

Let's explore the content of `infra/main.bicep` file, which is an entry point for the IaaC project.

```js
targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment that can be used as part of naming resource convention, the name of the resource group for your application will use this name, prefixed with rg-')
param environmentName string

@minLength(1)
@description('The location used for all deployed resources')
param location string
@secure()
@metadata({azd: {
  type: 'inputs'
  autoGenerate: {
    sql: {
      password: { len: 10 }
    }
  }}
})
param inputs object


var tags = {
  'azd-env-name': environmentName
}

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

module resources 'resources.bicep' = {
  scope: rg
  name: 'resources'
  params: {
    location: location
    tags: tags
  }
}

module serviceBus 'serviceBus/aspire.hosting.azure.bicep.servicebus.bicep' = {
  name: 'serviceBus'
  scope: rg
  params: {
    location: location
    principalId: resources.outputs.MANAGED_IDENTITY_PRINCIPAL_ID
    principalType: 'ServicePrincipal'
    queues: []
    serviceBusNamespaceName: 'servicebus'
    topics: []
  }
}
module sqlserver 'sqlserver/aspire.hosting.azure.bicep.sql.bicep' = {
  name: 'sqlserver'
  scope: rg
  params: {
    location: location
    databases: ['sqldb']
    principalId: resources.outputs.MANAGED_IDENTITY_PRINCIPAL_ID
    principalName: resources.outputs.MANAGED_IDENTITY_NAME
    serverName: 'sqlserver'
    inputs: inputs
  }
}
```

TODO: explore content of main.bicep

// adz infra synth
// azd provision
// configure connection strings

## Demo

### Locally

### Azure

## Conclusion

## References

* <https://cap.dotnetcore.xyz/>
* <https://learn.microsoft.com/en-us/dotnet/aspire/deployment/azure/aca-deployment-azd-in-depth>