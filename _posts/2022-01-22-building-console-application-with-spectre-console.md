---
layout: post
title: Console applications with Spectre.Console
categories: [ dotnet ]
tags: [ dotnet, cli, console ]
published: true
shortinfo: Learn an easy way to develop CLI applications
fullview: false
comments: true
hide-related: false
---

## TL;DR

*Spectre.Console* not only makes it easier to create beautiful console applications, but also it provides an application model to bind `args[]` to git-style commands.

```csharp
var app = new CommandApp();

app.Configure(c =>
{
    c.AddCommand<ExportBots>("scrape");
    c.AddCommand<ListBots>("list");
    c.AddCommand<DownloadBot>("download")
        .WithExample(new[] {"download", "--random"});
});

await app.RunAsync(args);
```

![help](/assets/spectre/help.png)

Source code: <https://github.com/NikiforovAll/cli-with-spectre-console>.

`Spectre.Console.Extensions` - <https://github.com/NikiforovAll/Spectre.Console.Extensions>.

## Introduction

Previously, I shared with you how to use `System.CommandLine` to develop CLI applications in my ["Develop Clean Command Line Applications with System.CommandLine. Clean CLI"](https://nikiforovall.github.io/dotnet/cli/2021/06/06/clean-cli.html) post. If you liked the approach and want to try an alternative solution, check out [Spectre.Console](https://spectreconsole.net/).

## UI Kit

You can use `Spectre.Console.AnsiConsole` to:

* Output text with different colors and styles
* Interact with the user - prompt, selection
* Render complex UI elements/widgets: tables, trees, ASCII images, status control, progress bars, etc.

<img src="/assets/spectre/ui-kit.png" width="800" />
<!-- ![ui-kit.png](/assets/spectre/ui-kit.png) -->

Credits: <https://spectreconsole.net/>

## Extensions

*Spectre.Console* is quite extensible and you can build custom `IRenderable` components on top of it. This is what I did. I developed additional widgets for *Spectre.Console* and put them inside NuGet packages `Spectre.Console.Extensions`:

| Package                               | Version                                                                                                                                            | Description                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `Spectre.Console.Extensions.Progress` | [![Nuget](https://img.shields.io/nuget/v/Spectre.Console.Extensions.Progress.svg)](https://nuget.org/packages/Spectre.Console.Extensions.Progress) | IProgress adapter and HttpClient reporting. |
| `Spectre.Console.Extensions.Table`    | [![Nuget](https://img.shields.io/nuget/v/Spectre.Console.Extensions.Table.svg)](https://nuget.org/packages/Spectre.Console.Extensions.Table)       | DataTable and DataSet support.              |

---

`Spectre.Console.Extensions.Progress` provides an adapter of BCL's `System.IProgress` to `Spectre.Progress`. Also, there is an option to plug `HttpClient` into `Spectre.Progress` so you can automatically report progress of downloading something.

`Spectre.Console.Extensions.Table` allows to draw well-known `System.Data.DataSet` and `System.Data.DataTable` by using `Spectre.Table`.

## Example - .NET Bots scrapper

I will show you how to develop CLI application based on *Spectre.Console*.

The goal is to fetch bots from .NET bot gallery <https://mod-dotnet-bot.net/gallery/> and show a bot inside a console.

Here is `--help` output looks like:

```bash
$ dotnet run -- -h
USAGE:
    dotnet-bots.dll [OPTIONS] <COMMAND>

EXAMPLES:
    dotnet-bots.dll download dotnet-bot-1.png
    dotnet-bots.dll download --random

OPTIONS:
    -h, --help       Prints help information
    -v, --version    Prints version information

COMMANDS:
    scrape
    list
    download
```

### Entry Point - `Program.cs`

```csharp
var services = new ServiceCollection();

services.AddDbContext<RobotContext>(opt => opt.UseSqlite("Data Source=robots.db"));
services.AddHttpClient();

var app = new CommandApp(new TypeRegistrar(services));

app.Configure(c =>
{
    c.AddCommand<ExportBots>("scrape");
    c.AddCommand<ListBots>("list");
    c.AddCommand<DownloadBot>("download")
        .WithExample(new[] {"download", "dotnet-bot-1.png"})
        .WithExample(new[] {"download", "--random"});
});

await app.RunAsync(args);
```

`Spectre.Console.Cli.CommandApp` defines the structure of the CLI application.

It is very easy to define git-style (verb) commands. As you can see, we adding three commands to the configuration.

If you have a more complex scenario, you might want to use `AddBranch` method you can organize your commands in a tree-like structure, e.g.:

```csharp
var app2 = new CommandApp();

app2.Configure(c =>
{
    c.AddBranch("bots", bots =>
    {
        // bot.exe bots list
        bots.AddCommand<ListBots>("list");
        bots.AddBranch("download", create =>
        {
            // bot.exe bots download table
            create.AddCommand<ExportBots>("table");
            // bot.exe bots download bot <bot-name.png>
            create.AddCommand<DownloadBot>("bot");
        });
    });
});
```

### Export bots - `ExportBots.cs`

`Spectre.Console.Cli.Command<T>` defines `Execute` method, it is a handler and called by `CommandApp`. The command is created by Dependency Injection container (DI), so you can expect dependencies to be resolved via constructor injection. In the command below, we retrieve bots from external source and store them.

💡 You can wire up the DI container if you need by providing an implementation of `ITypeRegistrar` as the constructor parameter. Note, there are no built-in adapters in `Spectre.Console.Cli`, but you can easily find a way to implement one. Check official documentation or source code for this post.

```csharp
public class ExportBotsSettings : CommandSettings {}

public class ExportBots : Command<ExportBotsSettings>
{
    private readonly RobotContext db;

    public ExportBots(RobotContext db) => this.db = db;

    public override int Execute(CommandContext context, ExportBotsSettings settings)
    {
        // details are omitted for brevity
        // the actual implementation parses HTML file and collects bots
        var robots = FindRobots(doc).ToList();

        this.db.Database.EnsureCreated();
        this.db.AddRange(robots);

        try
        {
            this.db.SaveChanges();
        }
        catch (Exception e) when (e.InnerException is not null)
        {
            AnsiConsole.WriteException(e.InnerException);
            return -1;
        }

        AnsiConsole.WriteLine();
        AnsiConsole.Markup("[default on grey] exported robots [/]");
        AnsiConsole.Markup($"[white on green] {robots.Count} [/]");
        AnsiConsole.WriteLine();

        return 0;
    }
}
```

* ➕ `AnsiConsole.WriteException` [prints](https://spectreconsole.net/exceptions) colored exceptions
* ➕`AnsiConsole.Markup` [outputs](https://spectreconsole.net/markup) rich text to console.

![scrape](/assets/spectre/scrape.png)

## List bots - `ListBots.cs`

Displaying tabular data is a very common task, here is how you can use `Spectre.Console.Extensions` to draw a table using Entity Framework. Basically, we want to transform the query to `System.Data.DataTable` object. You can always switch to [Spectre.Table](https://spectreconsole.net/widgets/table), it gives you full control over how you display data.

The method `public static IRenderable FromDataSet(this DataSet dataSet, Action<Panel>? configurePanel)` builds table that *Spectre.Console* can display.

```csharp
public class ListBots : Command<ListBotsSettings>
{
    private readonly RobotContext db;

    public ListBots(RobotContext db) => this.db = db;

    public override int Execute(CommandContext context, ListBotsSettings settings)
    {
        AnsiConsole.Write(new FigletText(".NET Bots").Centered().Color(Color.Purple));

        var dataset = new DataSet {DataSetName = "Bot Gallery",};
        var connection = this.db.Database.GetDbConnection();

        dataset.Tables.Add(RetrieveDataTable(connection, this.db.Robots));
        var dataSetToDisplay = dataset.FromDataSet(opt => opt.BorderColor(Color.Aqua));
        AnsiConsole.Write(dataSetToDisplay);

        return 0;
    }

    private static DataTable RetrieveDataTable(DbConnection connection, IQueryable query)
    {
        connection.Open();
        using var cmd = connection.CreateCommand();
        cmd.Connection = connection;
        cmd.CommandType = CommandType.Text;
        cmd.CommandText = query.ToQueryString();
        using var reader = cmd.ExecuteReader();
        var table = new DataTable();
        table.Load(reader);

        return table;
    }
}
```

* ➕ `Spectre.Console.FigletText` [renders](https://spectreconsole.net/widgets/figlet) FIGlet text.
* ➕ `Spectre.Console.Extensions.Table.FromDataSet` and `Spectre.Console.Extensions.Table.FromDataTable` [displays](https://github.com/nikiforovall/Spectre.Console.Extensions#spectreconsoleextensionstable-) tabular data as *Spectre.Console* tables.

![list](/assets/spectre/bot-list.png)

## Download and display a bot - `DownloadBot.cs`

Let's see how to retrieve a bot by name from the database and download and display ASCII image of the bot.

Before we delve into details let's see the overall structure of the command.

```csharp
public class DownloadBotSettings : CommandSettings
{
    [CommandArgument(0, "[name]")]
    [Description("Download bot by name")]

    public string? Name { get; set; }

    [CommandOption("-r|--random")]
    [Description("Specifies if random bot should be stored in the system")]
    public bool IsRandom { get; set; }
}

public class DownloadBot : AsyncCommand<DownloadBotSettings>
{
    private readonly HttpClient httpClient;
    private readonly RobotContext db;

    public DownloadBot(HttpClient httpClient, RobotContext db)
    {
        this.httpClient = httpClient;
        this.db = db;
    }

    public override async Task<int> ExecuteAsync(CommandContext context, DownloadBotSettings settings)
    {
        // omitted for brevity, will be explained in a moment
    }
}
```

As you may notice, instead of `Command` we use `AsyncCommand`. It allows us to use *async/await* inside handler code, so you don't need to do *sync-over-async*, which is not critical for this scenario, but still is a bad design choice if you have an alternative.

`DownloadBotSettings` contains two properties. The first one is a positional argument and the second an option/flag. *Spectre.Console* binds the `CommandSettings` for you, don't forget to pass `args` in your Program.cs `await app.RunAsync(args);`.

Let's see the insides of the handler. Everything starts with user input processing and we want to make sure we have a bot name to work with.

If a user doesn't specify bot name we can ask a user by using `AnsiConsole.Prompt`

```csharp
private void EnsureBotSettings(DownloadBotSettings settings)
{
    if (settings.IsRandom)
    {
        var toSkip = Random
            .Shared.Next(0, this.db.Robots.Count());
        settings.Name = this.db
            .Robots.Skip(toSkip).Take(1).First().Name;
    }
    else if (string.IsNullOrWhiteSpace(settings.Name))
    {
        settings.Name = AnsiConsole.Prompt(
            new SelectionPrompt<string>()
                .Title("What's your [green]favorite fruit[/]?")
                .PageSize(5)
                .AddChoices(this.db.Robots.Select(r => r.Name)));
    }
}
```

Exported bots are stored in the database, so we want to find one and try to retrieve the corresponding image and store it locally somewhere. Next, we will use [Spectre.Console.ImageSharp](https://www.nuget.org/packages/Spectre.Console.ImageSharp) to display saved image.

```csharp
public override async Task<int> ExecuteAsync(CommandContext context, DownloadBotSettings settings)
{
    this.EnsureBotSettings(settings);

    var robot = this.db.Robots.First(r => r.Name == settings.Name);

    var fileName = string.Empty;

    var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, robot.Uri);
    await AnsiConsole.Progress()
        .Columns(new ProgressColumn[]
        {
            new TaskDescriptionColumn(), new ProgressBarColumn(), new PercentageColumn(),
            new RemainingTimeColumn(), new SpinnerColumn(),
        }).StartAsync(this.httpClient, httpRequestMessage, "Downloading a bot", SaveImageToRandomFile);

    var rule = new Rule($"[red]{robot.Name}[/]") {Style = Style.Parse("red dim")};
    AnsiConsole.Write(rule);
    var image = new CanvasImage(fileName).MaxWidth(16);
    AnsiConsole.WriteLine();
    AnsiConsole.Write(new Panel(image).BorderColor(Color.Maroon));

    return 0;

    async Task SaveImageToRandomFile(Stream stream)
    {
        fileName = Path.GetTempPath() + Guid.NewGuid().ToString() + ".png";
        await using var fileStream = File.Create(fileName);
        stream.Seek(0, SeekOrigin.Begin);
        await stream.CopyToAsync(fileStream);
    }
```

* ➕ `Spectre.Console.SelectionPrompt` [prompts](https://spectreconsole.net/prompts/selection) user to select an option from provided list.
* ➕ `Spectre.Console.Extensions.Progress.StartAsync` [adds](https://github.com/NikiforovAll/Spectre.Console.Extensions#reporting-for-httpclient) HttpClient reporting capabilities by using [Spectre.Console.Progress](https://spectreconsole.net/live/progress). ⚠ You might want to check the implementation before using it because it performs additional buffering to do the reporting trick.
* ➕ `Spectre.Console.ImageSharp.CanvasImage` [displays](https://spectreconsole.net/widgets/canvas-image) ASCII images to console.

![download](/assets/spectre/download-bot.png)

💡 For full-featured terminal UI applications (TUIs) you might want to try something like [Terminal.Gui](https://github.com/migueldeicaza/gui.cs)

---

## Summary

*Spectre.Console* gives you everything you need to start developing good-looking and functional CLI applications. It gives you enough structure and building blocks to naturally evolve your applications over time.
