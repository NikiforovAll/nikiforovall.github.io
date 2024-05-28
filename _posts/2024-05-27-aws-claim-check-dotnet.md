---
layout: post
title: "Claim-Check Pattern with AWS Message Processing Framework for .NET and Aspire"
categories: [ dotnet, aws ]
tags: [ dotnet, aspnetcore, aws, cloud, s3, sns, sqs, aspire ]
published: true
shortinfo: "Learn how to use AWS.Messaging and Aspire to implement the Claim-Check pattern"
fullview: false
comments: true
related: true
mermaid: true
---****

## TL;DR

Learn how to use [AWS.Messaging](https://www.nuget.org/packages/AWS.Messaging/) by implementing Claim-Check pattern.

> The Claim-Check pattern allows workloads to transfer payloads without storing the payload in a messaging system. The pattern stores the payload in an external data store and uses a "claim check" to retrieve the payload. The claim check is a unique, obscure token or key. To retrieve the payload, applications need to present the claim-check token to the external data store.

Source code: <https://github.com/NikiforovAll/aws-claim-check-dotnet>

- [TL;DR](#tldr)
- [Introduction](#introduction)
  - [When to use Claim-Check pattern?](#when-to-use-claim-check-pattern)
- [What is AWS.Messaging?](#what-is-awsmessaging)
- [Implementation](#implementation)
  - [Goal](#goal)
  - [Code](#code)
    - [File Upload via API](#file-upload-via-api)
    - [File Processing via Worker](#file-processing-via-worker)
    - [OpenTelemetry support](#opentelemetry-support)
- [Conclusion](#conclusion)
- [References](#references)

## Introduction

>☝️The blog post will focus on code implementation and usage of `AWS.Messaging` and `Aspire` and not on the details of the Claim-Check pattern.For more details I highly recommend seeing [Azure/Architecture Center/Claim-Check pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/claim-check)

Traditional messaging systems are optimized to manage a high volume of small messages and often have restrictions on the message size they can handle. Large messages not only risk exceeding these limits but can also degrade the performance of the entire system when the messaging system stores them.

The solution to this problem is to use the Claim-Check pattern, and don't send large messages to the messaging system. Instead, send the payload to an external data store and generate a claim-check token for that payload. The messaging system sends a message with the claim-check token to receiving applications so these applications can retrieve the payload from the data store. The messaging system never sees or stores the payload.

<center>
    <img src="/assets/claim-check/claim-check-diagram.svg" width="70%" style="margin: 15px;">
</center>

1. Payload
2. Save payload in data store.
3. Generate claim-check token and send message with claim-check token.
4. Receive message and read claim-check token.
5. Retrieve the payload.
6. Process the payload.

### When to use Claim-Check pattern?

The following scenarios are use cases for the Claim-Check pattern:

* Messaging system limitations: Use the Claim-Check pattern when message sizes surpass the limits of your messaging system. Offload the payload to external storage. Send only the message with its claim-check token to the messaging system.
* Messaging system performance: Use the Claim-Check pattern when large messages are straining the messaging system and degrading system performance.

For example, AWS SQS has a message size limit of 256 KiB. See [Amazon SQS message quotas](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html) for more details.

## What is AWS.Messaging?

The *AWS Message Processing Framework for .NET* is an AWS-native framework that simplifies the development of .NET message processing applications that use AWS services such as Amazon Simple Queue Service (SQS), Amazon Simple Notification Service (SNS), and Amazon EventBridge. The framework reduces the amount of boiler-plate code developers need to write, allowing you to focus on your business logic when publishing and consuming messages.

The Message Processing Framework supports the following activities and features:

* Sending messages to SQS and publishing events to SNS and EventBridge.

* Receiving and handling messages from SQS by using a long-running poller, which is typically used in background services. This includes managing the visibility timeout while a message is being handled to prevent other clients from processing it.
* Handling messages in AWS Lambda functions.
* FIFO (first-in-first-out) SQS queues and SNS topics.
* OpenTelemetry for logging.

For a good introductory blog post see [AWS Developer Tools Blog / Introducing the AWS Message Processing Framework for .NET (Preview)](https://aws.amazon.com/blogs/developer/introducing-the-aws-message-processing-framework-for-net-preview/)

## Implementation

### Goal

🎯 Assume we want to process pdf documents provided by users to extract key phrases and store these key phrases for further processing.

Here's a step-by-step explanation of the process:

1. *File Submission*: A user submits a file through an API Gateway. This could be any document that needs to be processed, such as a PDF file.
2. *File Storage*: The API Gateway forwards the file to a REST API running on an EC2 instance. The API then stores the file in an S3 bucket and sends a message to an SNS (Simple Notification Service) topic with the location of the file in S3 (this is known as a claim-check pattern).
3. *Message Queuing*: The SNS topic puts the message into an SQS (Simple Queue Service) queue for processing. The API returns a 201 response to the API Gateway, which then returns a response to the user indicating that the file was successfully submitted.
4. *File Processing*: A background service running on another EC2 instance consumes the message from the SQS queue. This service retrieves the file from S3 and sends it to Amazon Textract for parsing.
5. *Text Extraction*: Amazon Textract loads the document, extracts the text, and returns the parsed content to the background service.
6. *Key Phrase Extraction*: The background service then sends the parsed content to Amazon Comprehend to extract key phrases.
7. *Result Storage*: The key phrases are then stored back in S3 by the background service. The service acknowledges the message in the SQS queue, removing it from the queue.

This workflow allows for the asynchronous processing of documents at scale. The user gets a quick response when they submit a file, and the heavy processing is done in the background, allowing the system to handle a large number of file submissions.

<center>
    <img src="/assets/claim-check/sd-aws.png" width="90%" style="margin: 15px;">
</center>

❗🤔 Arguably, in the world of AWS, there are cloud-native alternatives to the canonical claim check pattern. For example, you can subscribe to S3 events from a lambda function, but my goal is to demonstrate how to use AWS.Messaging and Claim-Check pattern implementation, and not to provide reference solution to this problem.

### Code

The solution consists of *Api*, *Processor* (Worker) components, and AWS resources defined via [CloudFormation](https://docs.aws.amazon.com/cloudformation/).

This application is based on Aspire integration for AWS. Basically, it bootstraps the the CloudFormation stack for your application during the `AppHost` startup.

```csharp
// AppHost/Program.cs
using Amazon;

var builder = DistributedApplication.CreateBuilder(args);

var awsConfig = builder.AddAWSSDKConfig().WithProfile("default").WithRegion(RegionEndpoint.USEast1);

var awsResources = builder
    .AddAWSCloudFormationTemplate("DocumentSubmissionAppResources", "aws-resources.template")
    .WithReference(awsConfig);

builder.AddProject<Projects.Api>("api").WithReference(awsResources);

builder.AddProject<Projects.Processor>("processor").WithReference(awsResources);

builder.Build().Run();
```

The code above is based on couple of NuGet packages:

- [Aspire.Hosting.AWS](https://www.nuget.org/packages/Aspire.Hosting.AWS) - Provides extension methods and resources definition for a .NET Aspire AppHost to configure the AWS SDK for .NET and AWS application resources.
- [Aspire.Hosting.AppHost](https://www.nuget.org/packages/Aspire.Hosting.AppHost) - Provides the core APIs and MSBuild logic for .NET Aspire AppHost projects.

To glue everything together, we need to take a look at CloudFormation template - "aws-resources.template". The interesting part here is the **Outputs** section. It serves as a contract between your application and infrastructure defined through Aspire.

```jsonc
{
    "AWSTemplateFormatVersion": "2010-09-09",
    "Parameters": {},
    "Resources": {
        // skipped content, see source code for more details.
    },
    "Outputs": {
        "DocumentQueueUrl": {
            "Value": {
                "Ref": "DocumentQueue"
            }
        },
        "DocumentTopicArn": {
            "Value": {
                "Ref": "DocumentTopic"
            }
        },
        "DocumentBucketName": {
            "Value": {
                "Ref": "DocumentBucket"
            }
        }
    }
}
```

In order to reference Outputs in our code I added next code:

```csharp
// ServiceDefaults/Extensions.cs
public static AwsResources AddAwsResources(this IHostApplicationBuilder builder)
{
    var awsResources = builder.Configuration.GetSection("AWS:Resources").Get<AwsResources>()!;

    // validate, consume at runtime via IOptions if needed.
    builder
        .Services.AddOptions<AwsResources>()
        .Configure(options => builder.Configuration.Bind("AWS:Resources", options))
        .ValidateOnStart();

    return awsResources;
}
```

And the model:

```csharp
// ServiceDefaults/AwsResources.cs
public class AwsResources
{
    [Required]
    [Url]
    public string DocumentQueueUrl { get; set; } = default!;

    [Required]
    public string? DocumentTopicArn { get; set; }

    [Required]
    public string? DocumentBucketName { get; set; }
}

```

Now, once we have the infrastructure ready, we can take a look at the components.

#### File Upload via API

It is very intuitive and easy to work with `AWS.Messaging`, all we need is to define a publisher:

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
var awsResources = builder.AddAwsResources();

builder.Services.AddAWSService<IAmazonS3>();

builder.Services.AddAWSMessageBus(messageBuilder =>
{
    messageBuilder.AddMessageSource("DocumentSubmissionApi");

    messageBuilder.AddSNSPublisher<DocumentSubmission>(awsResources.DocumentTopicArn);
});

var app = builder.Build();

app.MapUploadEndpoint();

app.Run();
```

Here is how to use it:

```csharp
app.MapPost(
    "/upload",
    async Task<Results<Created, BadRequest<string>>> (
        IFormFile file,
        [FromServices] IOptions<AwsResources> resources,
        [FromServices] IAmazonS3 s3Client,
        [FromServices] IMessagePublisher publisher,
        [FromServices] TimeProvider timeProvider,
        [FromServices] ILogger<Program> logger
    ) =>
    {
        if (file is null or { Length: 0 })
        {
            return TypedResults.BadRequest("No file uploaded.");
        }

        using var stream = file.OpenReadStream();
        var bucketName = resources.Value.DocumentBucketName;
        var key = Guid.NewGuid().ToString();

        await s3Client.PutObjectAsync(
            new PutObjectRequest
            {
                BucketName = bucketName,
                Key = key,
                InputStream = stream
            }
        );

        var response = await publisher.PublishAsync(
            new DocumentSubmission { CreatedAt = timeProvider.GetLocalNow(), Location = key }
        );

        logger.LogInformation("Published message with id {MessageId}", response.MessageId);

        return TypedResults.Created();
    }
);
```

#### File Processing via Worker

Note, in this case we need to provide an SQS Queue Url to listen to.

```csharp
// Program.cs
var builder = Host.CreateApplicationBuilder(args);

builder.AddServiceDefaults();

var awsResources = builder.AddAwsResources();

builder.Services.AddAWSService<IAmazonTextract>();
builder.Services.AddAWSService<IAmazonComprehend>();
builder.Services.AddAWSService<IAmazonS3>();

builder.Services.AddAWSMessageBus(builder =>
{
    builder.AddSQSPoller(awsResources.DocumentQueueUrl);

    builder.AddMessageHandler<DocumentSubmissionHandler, DocumentSubmission>();
});

builder.Build().Run();
```

Here is the handler:

```csharp
public class DocumentSubmissionHandler(
    IAmazonTextract amazonTextractClient,
    IAmazonComprehend amazonComprehendClient,
    IAmazonS3 s3Client,
    IOptions<AwsResources> resources,
    ILogger<DocumentSubmissionHandler> logger
) : IMessageHandler<DocumentSubmission>
{
    public async Task<MessageProcessStatus> HandleAsync(
        MessageEnvelope<DocumentSubmission> messageEnvelope,
        CancellationToken token = default
    )
    {
        logger.LogInformation("Received message - {MessageId}", messageEnvelope.Id);

        var bucketName = resources.Value.DocumentBucketName;
        var key = messageEnvelope.Message.Location;

        var textBlocks = await this.AnalyzeDocumentAsync(bucket, key, token);

        var keyPhrases = await this.DetectKeyPhrasesAsync(textBlocks, token);

        await this.StorKeyPhrases(keyPhrases, bucket, key, token);

        return MessageProcessStatus.Success();
    }
}
```

#### OpenTelemetry support

The awesome thing about `Aspire` and `AWS.Messaging` is the native OpenTelemetry support. Here is how to add `AWS.Messaging` instrumentation:

```csharp
// ServiceDefaults/Extensions.cs
public static IHostApplicationBuilder ConfigureOpenTelemetry(
        this IHostApplicationBuilder builder
)
{
    builder.Logging.AddOpenTelemetry(logging =>
    {
        logging.IncludeFormattedMessage = true;
        logging.IncludeScopes = true;
    });

    builder
        .Services.AddOpenTelemetry()
        .WithMetrics(metrics =>
        {
            metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation();
        })
        .WithTracing(tracing =>
        {
            tracing
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddAWSInstrumentation() // <-- add this
                .AddAWSMessagingInstrumentation(); // <-- and this
        });

    builder.AddOpenTelemetryExporters();

    return builder;
}
```

The result of file upload from Aspire Dashboard:

<center>
    <img src="/assets/claim-check/trace-claim-check.png" style="margin: 15px;">
</center>

💡 `Aspire` is great for investigating how distributed systems work. We can use it to deepen our understanding of Claim-Check pattern in our case.

## Conclusion

In conclusion, leveraging the power of `AWS.Messaging` coupled with `Aspire` can significantly streamline the process of .NET and AWS Cloud development. These tools simplify the complexities associated with development of distributed systems.

## References

1. <https://github.com/awslabs/aws-dotnet-messaging>
2. <https://aws.amazon.com/blogs/developer/introducing-the-aws-message-processing-framework-for-net-preview/>
3. <https://learn.microsoft.com/en-us/azure/architecture/patterns/claim-check>
4. <https://docs.aws.amazon.com/sdk-for-net/v3/developer-guide/msg-proc-fw.html>
5. <https://www.enterpriseintegrationpatterns.com/patterns/messaging/StoreInLibrary.html>
6. <https://docs.aws.amazon.com/prescriptive-guidance/latest/automated-pdf-analysis-solution/welcome.html>
