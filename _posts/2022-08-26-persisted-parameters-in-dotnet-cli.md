---
layout: post
title: Add persisted parameters to CLI applications in .NET
categories: [ dotnet ]
tags: [ dotnet, console, cli,  systemcommandline]
published: true
shortinfo: Learn how to use System.CommandLine to implement persisted parameters in CLI/console applications.
fullview: false
comments: true
hide-related: false
mermaid: true
---

- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Implement configuration storage](#implement-configuration-storage)
  - [Test configuration commands](#test-configuration-commands)
- [Use configuration in business logic](#use-configuration-in-business-logic)
- [Persisted parameters](#persisted-parameters)
  - [Demo](#demo)
- [Summary](#summary)
- [Reference](#reference)

## TL;DR

See how to implement *persisted parameters* feature in a CLI/console application. For example, Azure CLI offers persisted parameters that enable you to store parameter values for continued use. You will learn how to use `System.CommandLine`. It provides building blocks that make functionality composable and reusable.

Source code: <https://github.com/NikiforovAll/cli-persistent-parameters-example>

## Introduction

Persisted parameters improve the overall developer experience. Since the previous values are stored and are ready to be re-used during the next command run. It is easy to understand the benefit of this feature by looking at how `az` does it:

```bash
# Turn persisted parameters on.
az config param-persist on

# Create a resource group.
az group create --name RGName --location westeurope

# Create an Azure storage account in the resource group omitting "--location" and "--resource-group" parameters.
az storage account create \
  --name sa3fortutorial \
  --sku Standard_LRS
```

As you might assume, there is some sort of state involved. So before we take a look at persisted parameters implementation let's look at how to implement a configuration in general.

Both Azure CLI and AWS CLI utilize a dedicated file created in a well-known directory. The format of the file is intended to be lightweight and human-readable. *Ini* markup language will do.

For example:

- `~/.azure/config` is used by Azure CLI
- `~/.aws/config` and `~/.aws/credentials` are used by AWS CLI

Here is what `~/.azure/config` can look like:

```text
───────┬────────────────────────────────────────────────────────────────────────
       │ File: /home/oleksii_nikiforov/.azure/config
───────┼────────────────────────────────────────────────────────────────────────
   1   │ [cloud]
   2   │ name = AzureCloud
   3   │ 
   4   │ [core]
   5   │ first_run = yes
   6   │ output = jsonc
   7   │ only_show_errors = false
   8   │ error_recommendation = on
   9   │ no_color = True
  10   │ disable_progress_bar = false
  11   │ collect_telemetry = no
───────┴────────────────────────────────────────────────────────────────────────
```

## Implement configuration storage

My goal is to replicate the behavior of `az` CLI and make the implementation reusable, so you can just grab the code and add it to your application.

Let's look at commands provided by `az` CLI to work with the configuration.

```bash
> az config -h

Group
    az config : Manage Azure CLI configuration.
        Available since Azure CLI 2.10.0.
        WARNING: This command group is experimental and under development. Reference and support
        levels: https://aka.ms/CLI_refstatus

Subgroups:
    param-persist : Manage parameter persistence.

Commands:
    get           : Get a configuration.
    set           : Set a configuration.
    unset         : Unset a configuration.
```

At the high level, the structure could be defined as follows:

```csharp
// Program.cs
var root = new RootCommand();
root.Name = "clistore";

root.AddConfigCommands();

// ConfigCommands.cs
public static RootCommand AddConfigCommands(this RootCommand root)
{
    var command = new Command("config", "Manage CLI configuration");

    command.AddCommand(BuildGetCommand());
    command.AddCommand(BuildSetCommand());
    command.AddCommand(BuildUnsetCommand());

    root.AddCommand(command);
    return root;
}

private static Command BuildGetCommand()
{
    var get = new Command("get", "Get a configuration");
    var getpath = new Argument<string?>(
        "key",
        () => default,
        @"The configuration to get. If not provided, all sections and configurations
will be listed. If `section` is provided, all configurations under the
specified section will be listed. If `<section>.<key>` is provided, only
the corresponding configuration is shown.");
    get.AddArgument(getpath);

    return get;
}

private static Command BuildSetCommand(CliConfigurationProvider configurationProvider)
{
    var set = new Command("set", "Set a configuration");
    var setpath = new Argument<string[]>(
        "key",
        "Space-separated configurations in the form of <section>.<key>=<value>.");
    set.AddArgument(setpath);

    return set;
}

private static Command BuildUnsetCommand(CliConfigurationProvider configurationProvider)
{
    var unset = new Command("unset", "Unset a configuration");

    var unsetpath = new Argument<string[]>(
        "key",
        "The configuration to unset, in the form of <section>.<key>.");
    unset.AddArgument(unsetpath);

    return unset;
}
```

Now, we want the actual code that handles commands. But before that, we need to grab the configuration from someplace. In my opinion, we already have the required and de-facto standard way of working with configuration namely - `IConfiguration`. The only this is left is to use Dependency Injection capabilities of `System.CommandLine` and define `BinderBase<IConfiguration>`. See <https://docs.microsoft.com/en-us/dotnet/standard/commandline/dependency-injection> for more details.

```csharp
public class CliConfigurationProvider : BinderBase<IConfiguration>
{
    public static CliConfigurationProvider Create(string storeName = "clistore") =>
        new(storeName);

    public CliConfigurationProvider(string storeName) => StoreName = storeName;

    public string StoreName { get; }

    public string ConfigLocationDir => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
        $".{StoreName.TrimStart('.')}");

    public string ConfigLocation => Path.Combine(ConfigLocationDir, "config");

    protected override IConfiguration GetBoundValue(BindingContext bindingContext) => GetConfiguration();

    public IConfiguration GetConfiguration()
    {
        var configuration = new ConfigurationBuilder()
            .AddIniFile(ConfigLocation, optional: true)
            .AddEnvironmentVariables(StoreName.ToUpperInvariant())
            .Build();

        return configuration;
    }
}
```

As you may notice, we are using `ConfigurationBuilder` to compose a configuration not only from a configuration file but also from prefix environment variables. As result, we can override parameters, e.g.: `CLISTORE_MyConfigKey`.

The `config get` command handler. Note, the `IConfiguration` is injected as parameter:

```csharp
var get = new Command("get", "Get a configuration");
var getpath = new Argument<string?>("key");
get.AddArgument(getpath);

get.SetHandler((string? path, IConfiguration configuration) =>
{
    var output = new Dictionary<string, object[]>();

    foreach (var config in configuration.GetChildren())
    {
        output[config.Key] = config.GetChildren()
            .Select(x => new { Name = x.Key, x.Value })
            .ToArray();
    }

    if (output.Any())
    {
        Console.WriteLine(JsonSerializer.Serialize(output, new JsonSerializerOptions()
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        }));
    }

    return Task.CompletedTask;
}, getpath, CliConfigurationProvider.Create(root.Name));

return get;
```

On the write side, we need to be able to manipulate config file. I will skip parsing details. Basically, we load the file from known location and can call `Save(path)` when we are ready.

```csharp
public class CliConfigurationProvider : BinderBase<IConfiguration>
{
    // ... skipped
    public IniFile LoadIniFile()
    {
        var ini = new IniFile();

        Directory.CreateDirectory(ConfigLocationDir);

        if (File.Exists(ConfigLocation))
        {
            ini.Load(ConfigLocation);
        }

        return ini;
    }
}
```

The `config set` command handler.

```csharp
var configurationProvider = CliConfigurationProvider.Create(root.Name);
var set = new Command("set", "Set a configuration");
var setpath = new Argument<string[]>("key");
set.AddArgument(setpath);

set.SetHandler((string[] path) =>
{
    var ini = configurationProvider.LoadIniFile();

    foreach (var p in path)
    {
        var keyvalue = p.Split('=');
        var (key, value) = (keyvalue[0], keyvalue[^1]);

        var sectionKey = key[..key.IndexOf('.')];
        var configKey = key[(key.IndexOf('.') + 1)..];
        ini[sectionKey][configKey] = value;
    }
    ini.Save(configurationProvider.ConfigLocation);
    return Task.CompletedTask;
}, setpath);

return set;
```

### Test configuration commands

We can use [Verify](https://github.com/VerifyTests/Verify) to perform snapshot testing and check for the correct output of the program. In order to make things easier and simplify working with process output capturing and invocation, I used [CliWrap](https://github.com/Tyrrrz/CliWrap).

Here are some tests. I included *.verfied.txt content as comments. For more details please refer to [Tests](https://github.com/NikiforovAll/cli-persistent-parameters-example/tree/main/tests/CliStore.Tests).

```csharp
[UsesVerify]
public class StoreCommands_Specs
{
    // kinda ugly, but I can live with it
    private const string relativeSourcePath = "../../../../../src";

    public StoreCommands_Specs()
    {
        // cleanup, runs every test, concurrent test execution is disabled
        EnsureDeletedConfigFolder();
    }

    [Fact]
    public async Task Help_text_is_displayed_for_config()
    {
        var stdOutBuffer = Execute("config", "--help");

        await Verify(stdOutBuffer.ToString());
    }
    // Description:
    // Manage CLI configuration
    // Usage:
    // clistore config [command] [options]
    // Options:
    // -?, -h, --help  Show help and usage information
    // Commands:
    // get <key>    Get a configuration []
    // set <key>    Set a configuration
    // unset <key>  Unset a configuration

    [Fact]
    public async Task Get_config_is_performed_on_populated_config()
    {
        Execute("config", "set", "core.target=my_value");
        Execute("config", "set", "core.is_populated=true");
        Execute("config", "set", "extra.another_section=false");
        var stdOutBuffer = Execute("config", "get");

        await Verify(stdOutBuffer.ToString());
    }
    // {
    // "core": [
    //     {
    //     "name": "is_populated",
    //     "value": "true"
    //     },
    //     {
    //     "name": "target",
    //     "value": "my_value"
    //     }
    // ],
    // "extra": [
    //     {
    //     "name": "another_section",
    //     "value": "false"
    //     }
    // ]
    // }

    private static (CommandResult, StringBuilder, StringBuilder) Execute(params string[] command)
    {
        var stdOutBuffer = new StringBuilder();
        var stdErrBuffer = new StringBuilder();

        var result = Cli.Wrap("dotnet")
            .WithStandardOutputPipe(PipeTarget.ToStringBuilder(stdOutBuffer))
            .WithStandardErrorPipe(PipeTarget.ToStringBuilder(stdErrBuffer))
            .WithArguments(args => args
                .Add("run")
                .Add("--project")
                .Add(relativeSourcePath)
                .Add("--")
                .Add(command))
            .WithValidation(CommandResultValidation.None)
            .ExecuteAsync().ConfigureAwait(false).GetAwaiter().GetResult();

        return stdOutBuffer;
    }

    private static void EnsureDeletedConfigFolder()
    {
        var path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".clistore",
            "config");
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }
}
```

Here is the content of `~/.clistore/config` file after test run:

```text

       │ File: /home/oleksii_nikiforov/.clistore/config
───────┼────────────────────────────────────────────────────────────────────────
   1   │ [core]
   2   │ target=my_value
   3   │ is_populated=true
   4   │ 
   5   │ [extra]
   6   │ another_section=false
   7   │ 
───────┴────────────────────────────────────────────────────────────────────────
```

## Use configuration in business logic

Let's say we want to print out "Hello, {target}" and take {target} as an option/argument. If an option is not provided we should check configuration storage for default values.

The first approach is to directly use `BinderBase<IConfiguration>` and read from `IConfiguration`.

```csharp
// Program.csharp
root.AddConfigCommands(out var configProvider);
root.AddCommand(GreetFromConfigCommand(configProvider));
// GreetCommandsFactory.cs
static void Greet(string target) => Console.WriteLine($"Hello, {target}");

public static Command GreetFromConfigCommand(CliConfigurationProvider configProvider)
{
    var command = new Command("greet-from-config", "Demonstrates how to use IConfiguration from DI container");
    var targetOption = new Option<string?>("--target");
    targetOption.IsRequired = false;
    command.AddOption(targetOption);
    command.SetHandler((string? target, IConfiguration configuration) =>
        Greet(target ?? configuration["core:target"]), targetOption, configProvider);

    return command;
}
```

The second one is to provide the default value factory `getDefaultValue`. Note, it might slow down built-in suggestions:

```csharp
// Program.csharp
root.AddConfigCommands(out var configProvider);
root.AddCommand(GreetFromDefaultValueCommand(configProvider));
// GreetCommandsFactory.cs
public static Command GreetFromDefaultValueCommand(CliConfigurationProvider configProvider)
{
    var command = new Command("greet-from-default-value", "Demonstrates how to provide default value to an option");
    var targetOptionWithDefault = new Option<string>("--target", getDefaultValue: () =>
    {
        // note, this is evaluate preemptively which may slow down autocompletion
        var configuration = configProvider.GetConfiguration();
        return configuration["core:target"];
    });
    command.AddOption(targetOptionWithDefault);
    command.SetHandler((string target) => Greet(target), targetOptionWithDefault);

    return command;
}
```

The benefit of the approach above is that you don't need to worry about configuration in the handler code.

And handler could be simplified to `command.SetHandler(Greet, targetOptionWithDefault)` by using C# method groups.

The tests:

```csharp
[Fact]
public async Task GreetFromConfig_greets_with_populated_target_config()
{
    Execute("config", "set", "core.target=World");
    var stdOutBuffer = Execute("greet-from-config");

    await Verify(stdOutBuffer.ToString());
}
// Hello, World


[Fact]
public async Task GreetFromDefaultValue_greets_with_default_value_from_populated_target_config()
{
    Execute("config", "set", "core.target=World");
    var stdOutBuffer = Execute("greet-from-default-value");

    await Verify(stdOutBuffer.ToString());
}
// Hello, World

```

## Persisted parameters

Now, we have a good grasp of how to implement stateful CLI applications. We can see how to add the persistent parameters feature. Let's start with expected behavior and the corresponding test:

```csharp
[Fact]
public async Task GreetFromPersisted_greets_with_persisted_params_value()
{
    Execute("greet-from-persisted", "--target", "World");
    var stdOutBuffer = Execute("greet-from-persisted");

    await Verify(stdOutBuffer.ToString());
}
// Hello, World
```

The `--target` parameter is stored as a result of a previous successful invocation. We can organize a dedicated section in configuration to store previously used values.

To define persisted options we can use `BinderBase<T>` as a decorator to `Option<T>`. Like following:

```csharp
public class PersistedOptionProvider<T> : BinderBase<T?>
{
    // skipped 

    protected override T? GetBoundValue(BindingContext bindingContext)
    {
        if (!bindingContext.ParseResult.HasOption(_option))
        {
            var ini = _configProvider.LoadIniFile();
            string text = ini[CliConfigurationProvider.PersistedParamsSection][_option.Name].ToString();
            var value = (T)TypeDescriptor.GetConverter(typeof(T))
                .ConvertFromString(text)!;

            return value;
        }

        return bindingContext.ParseResult.GetValueForOption(_option);
    }
}
```

So, if option is not provided, we check the config file for a potential fallback value.

Here is the handler for the persisted parameters greeter variation:

```csharp
public static Command GreetFromPersistedCommand(CliConfigurationProvider configProvider)
{
    var command = new Command("greet-from-persisted", "Demonstrates how to use persisted parameters");
    var targetOption = new Option<string>("--target");
    targetOption.IsRequired = false;
    command.AddOption(targetOption);

    command.SetHandler(Greet, new PersistedOptionProvider<string>(targetOption, configProvider));

    return command;
}
```

That solves the **read** side of the task. What about the **write** side? We want to store options upon successful completion after all.

Thankfully, `System.CommandLine` provides a handy abstraction - middleware. We can use it on `CommandLineBuilder.AddMiddleware`.

```csharp
var root = new RootCommand();
root.Name = "clistore";

var commandLineBuilder = new CommandLineBuilder(root);

commandLineBuilder.AddMiddleware(async (context, next) => {/*implementation goes here*/});
commandLineBuilder.UseDefaults();

var parser = commandLineBuilder.Build();
await parser.InvokeAsync(args);
```

It fairly common practice to pack middleware registration in extension methods. Here is the how to write persisted parameters by using middleware approach.

```csharp
///<summary>
/// Stores provided options registered with CliConfigurationProvider.RegisterPersistedOption
///</summary>
public static CommandLineBuilder AddPersistedParametersMiddleware(
    this CommandLineBuilder builder, CliConfigurationProvider configProvider)
{
    return builder.AddMiddleware(async (context, next) =>
    {
        Lazy<IniFile> config = new(() => configProvider.LoadIniFile());
        var parseResult = context.ParseResult;

        await next(context);

        bool newValuesAdded = false;
        foreach (var option in configProvider.PersistedOptions)
        {
            if (parseResult.HasOption(option))
            {
                config.Value[CliConfigurationProvider.PersistedParamsSection][option.Name] =
                    parseResult.GetValueForOption(option)?.ToString();
                newValuesAdded = true;
            }
        }

        if (newValuesAdded)
        {
            config.Value.Save(configProvider.ConfigLocation);
        }
    });
}
```

### Demo

```bash
17:32 $ dotnet run -- -h
Description:
  Shows proof of concept of how to store persistent configuration in a CLI apps

Usage:
  clistore [command] [options]

Options:
  --version       Show version information
  -?, -h, --help  Show help and usage information

Commands:
  config                    Manage CLI configuration
  greet-from-config         Demonstrates how to use IConfiguration from DI container
  greet-from-default-value  Demonstrates how to provide default value to an option
  greet-from-persisted      Demonstrates how to use persisted parameters

✘-1 ~/projects/configuration-builder/src [main|✔] 
17:32 $ dotnet run -- greet-from-persisted --target foo
Hello, foo
✘-1 ~/projects/configuration-builder/src [main|✔] 
17:32 $ dotnet run -- greet-from-persisted 
Hello, foo
✘-1 ~/projects/configuration-builder/src [main|✔] 
17:32 $ dotnet run -- greet-from-persisted --target bar
Hello, bar
```

## Summary

I've shown you how to use `System.CommandLine` and how to implement persisted parameters feature in your CLI/console application. The suggested code is not production-ready but is a decent starting point.

## Reference

* <https://docs.microsoft.com/en-us/dotnet/standard/commandline/>
* <https://docs.microsoft.com/en-us/cli/azure/param-persist-tutorial?tabs=azure-cli>
* <https://github.com/VerifyTests/Verify>
* <https://github.com/Tyrrrz/CliWrap>
