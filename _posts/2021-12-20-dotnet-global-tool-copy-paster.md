---
layout: post
title: Use System.CommandLine to write .NET global tools. Copy-paste-driven development with copy-paster.
categories: [ dotnet ]
tags: [ dotnet, productivity, cli, console ]
published: true
shortinfo: Learn how to create a .NET tool.
fullview: false
comments: true
related: true
---

## TL;DR

Learn how to write a well-structured CLI application and pack it as a .NET tool.

## Introduction

Previously, I wrote a [blog post](https://nikiforovall.github.io/dotnet/cli/2021/06/06/clean-cli.html) that explains to you how to create something called "Clean CLI" - a combination of CLI application and Clean Architecture. This time I want to show you how to build .NET tool using the same techniques.

The .NET CLI lets you create a console application as a tool, which others can install and run. .NET tools are NuGet packages that could be installed from the .NET CLI.

A tool can be installed in the following ways:

* As a global tool - The tool binaries are installed in a default directory that is added to the PATH environment variable.
* As a local tool.
* As a global tool in a custom location. The tool binaries are installed in a default directory. You invoke the tool from the installation directory or any of its subdirectories.

### Example application - Copy-paste-driven development with copy-paster

I like to optimize little things in my developer inner-loop. Lately, I found myself copying some code from GitHub over and over again. You may call me a copy-paste-driven development practitioner. I decided to write a tool to simplify efforts of downloading files from github - [copy-paster](https://github.com/NikiforovAll/copy-paster) (`copa` for short). At first, it was a joke ([a meme](https://twitter.com/nicodotgay/statuses/1458891554026930181) if you like), I just wanted to show you how to write a .NET tool by example, but now, I really use `copa` 😅.

Usage:

`copa https://github.com/NikiforovAll/copy-paster/blob/main/LICENSE`

.NET tools can be found by running `dotnet tool search` or simply use <https://nuget.org> (there is a filter for global tools).

```bash
~\dev
➜  dotnet tool search copy-paster
Package ID                   Latest Version      Authors           Downloads      Verified
------------------------------------------------------------------------------------------
nikiforovall.copypaster      1.0.0               nikiforovall      0
```

Once discovered, a tool can be installed like this:

```bash
dotnet tool install --global NikiforovAll.CopyPaster
```

## Create global tool 🔨

Let's start off by creating simple console application.

`dotnet new console -n copy-paster`

Install main dependencies to build a .NET tool.

```bash
dotnet add package System.CommandLine # command line parsing and invocation
dotnet add package System.CommandLine.Hosting # Plug dependency injection container
dotnet add package Microsoft.Extensions.Hosting # Default DI container
dotnet add package Microsoft.Extensions.DependencyInjection.Abstractions
dotnet add package Spectre.Console # Makes it easier to create beautiful console apps
```

As mentioned, .NET tool is nothing but a console application packaged and distributed as a NuGet package. The only thing to do is to add special properties used by MSBuild to package .NET tools.

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <ToolCommandName>copa</ToolCommandName>
    <PackAsTool>True</PackAsTool>
    <OutputType>Exe</OutputType>
    <TargetFramework>net6</TargetFramework>
  </PropertyGroup>
</Project>
```

Application's entry point looks like this:

```csharp
using System.CommandLine;
using System.CommandLine.Builder;
using System.CommandLine.Hosting;
using System.CommandLine.Parsing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NikiforovAll.CopyPaster.Commands;
using NikiforovAll.CopyPaster.Services;

var runner = new CommandLineBuilder(new DownloadFromGithub())
    .UseHost(_ => new HostBuilder(), (builder) => builder
        .ConfigureServices((_, services) =>
        {
            services.AddHttpClient<IGithubCodeDownloader, GitHubCodeDownloader>();
            services.AddSingleton(new FileSaver());
        })
        .UseCommandHandler<DownloadFromGithub, DownloadFromGithub.Handler>())
        .UseDefaults().Build();

await runner.InvokeAsync(args);
```

1. `System.CommandLine.Builder.CommandLineBuilder` is used to define CLI applications. It is responsible for the way your CLI looks and feels.
2. `System.CommandLine.Hosting.HostingExtensions.UseHost` accepts `Microsoft.Extensions.Hosting.IHostBuilder` as input parameter and enables Dependency Injection configuration. For example, you can register an implementation of `System.CommandLine.Invocation.ICommandHandler` in DI container, so it will be automatically resolved from the DI container during command execution.
3. `System.CommandLine.Hosting.UseCommandHandler` connects `System.CommandLine.Command` to `System.CommandLine.Invocation.ICommandHandler`.
4. `CommandLineBuilder.Build()` returns `System.CommandLine.Parsing.Parser` that is used to parse arguments and to run the CLI application.

The anatomy of command is pretty simple:

```csharp
public class DownloadFromGithub : RootCommand
{
    public DownloadFromGithub()
        : base("Copies file by url")
    {
        this.AddArgument(new Argument<string>("url", "url"));
        this.AddOption(new Option<string>(
            new string[] { "--output", "-o" }, "Output file path"));
    }

    public new class Handler : ICommandHandler
    {
        public string? Url { get; set; }
        public string? Output { get; set; }

        public Handler(IGithubCodeDownloader codeDownloader, FileSaver fileSaver)
        {
            //...
        }
        public async Task<int> InvokeAsync(InvocationContext context)
        {
            //...
        }
    }
}
```

1. Arguments and options are registered in a declarative manner inside the constructor.
2. Every `System.CommandLine.Command` command contains associated handler with it. `public ICommandHandler? Handler {get; set;}` but in the DI scenario we want to let DI to do it for us. `ICommandHandler` can be declared anywhere in your project, but I prefer to locate it inside the `Command` declaration
3. `ICommandHandler.InvokeAsync` is used to describe how the command should be processed. Note, in order to accept input parameters (arguments, options, etc.) you need to define public properties inside `ICommandHandler`, names of the properties should match the full names specified in a command declaration. E.g. *"--output"* option corresponds to `public string? Output { get; set; }`.

### Publish 📢

Since every .NET tool is a NuGet package. You can specify additional build parameters to improve discoverability and overall user experience at <https://nuget.org>

```xml
<Project>
  <PropertyGroup Label="Authoring">
    <Company>nikiforovall</Company>
    <Authors>nikiforovall</Authors>
  </PropertyGroup>

  <PropertyGroup Label="Package">
    <Title>CopyPaster (copa)</Title>
    <Description>Enables copy-paste driven development. CopyPaster (aka copa)</Description>
    <PackageTags>global-tool;copy-paste;productivity</PackageTags>
    <PackageLicenseExpression>MIT</PackageLicenseExpression>
    <PackageProjectUrl>https://github.com/nikiforovall/copy-paster</PackageProjectUrl>
    <PackageIcon>Icon.jpg</PackageIcon>
    <PackageReleaseNotes>https://github.com/nikiforovall/copy-paster/releases</PackageReleaseNotes>
  </PropertyGroup>

  <PropertyGroup Label="Repository">
    <RepositoryUrl>https://nuget.org/packages/NikiforovAll.CopyPaster</RepositoryUrl>
    <RepositoryType>git</RepositoryType>
    <NeutralLanguage>en-US</NeutralLanguage>
  </PropertyGroup>
</Project>
```

Once ready, all you need to do is to pack the NuGet package and upload it. I use [Cake](https://cakebuild.net/docs/running-builds/runners/dotnet-tool) but it is totally fine to pack it with `dotnet pack`.

```cake
Task("Pack")
    .Description("Creates NuGet packages and outputs them to the artefacts directory.")
    .Does(() =>
    {
        DotNetPack(
            ".",
            new DotNetPackSettings()
            {
                Configuration = configuration,
                IncludeSymbols = true,
                MSBuildSettings = new DotNetMSBuildSettings(),
                NoBuild = false,
                NoRestore = false,
                OutputDirectory = artefactsDirectory,
            });
    });
```

Before publishing, you may want to install a tool from a folder:

```bash
dotnet tool install --global --add-source ./Artefacts
```

---

## Summary

I hope this blog post motivates you to create your own .NET tools. Please feel free to contribute to [copy-paster](https://github.com/NikiforovAll/copy-paster). Thanks 👋.

### Reference

* <https://docs.microsoft.com/en-us/dotnet/core/tools/global-tools>
* <https://docs.microsoft.com/en-us/dotnet/core/tools/global-tools-how-to-create>
* <https://nikiforovall.github.io/dotnet/cli/2021/06/06/clean-cli.html>
* <https://github.com/NikiforovAll/copy-paster>
