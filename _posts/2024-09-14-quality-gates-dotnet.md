---
layout: post
title: "A Tyrant Guide to Code Quality Gates featuring CSharpier, Husky.NET, and SonarCloud"
categories: [ dotnet ]
tags: [ dotnet, cicd ]
published: true
shortinfo: "Learn how to enforce code quality gates in your .NET projects."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

Learn how to enforce code quality gates in your .NET projects.

- [TL;DR](#tldr)
- [Motivation](#motivation)
  - [Developer Feedback Loop](#developer-feedback-loop)
- [Code Quality Aspects](#code-quality-aspects)
  - [Code Formatting](#code-formatting)
  - [Spelling](#spelling)
  - [Coding Style and Code Analysis](#coding-style-and-code-analysis)
  - [Code Analysis Tools](#code-analysis-tools)
- [Demo](#demo)
- [Conclusion](#conclusion)
- [References](#references)

**Source code:** <https://github.com/NikiforovAll/quality-gateways-demo-dotnet> [![Build](https://github.com/NikiforovAll/quality-gateways-demo-dotnet/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/NikiforovAll/quality-gateways-demo-dotnet/actions/workflows/build.yml) [![SonarCloud](https://github.com/NikiforovAll/quality-gateways-demo-dotnet/actions/workflows/sonar.yml/badge.svg)](https://github.com/NikiforovAll/quality-gateways-demo-dotnet/actions/workflows/sonar.yml)[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=NikiforovAll_quality-gateways-demo-dotnet&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=NikiforovAll_quality-gateways-demo-dotnet)

## Motivation

In today's fast-paced development world, maintaining high code quality is important, especially when working in a team environment. One effective way to ensure this is by enforcing code quality gates.🫸

*Code quality gates* are automated checks that ensure code meets predefined quality standards before it is merged into the main codebase. They help catch issues early in the development process, reducing the likelihood of bugs and technical debt.

💡 From my experience, maintaining consistent code base is crucial for the long-term success of a project. It helps developers understand the codebase better, reduces the time spent on code reviews, and makes it easier to onboard new team members.

Small issues and inconsistencies are left unaddressed in the codebase can create a perception of low quality and encourage the introduction of more issues over time. This can result in a deteriorating codebase and increased technical debt.
It is so called "broken windows theory 🪟" in the context of software development.

💡 The quality of code base reflects the team's professionalism and commitment to delivering high-quality software.

On another hand, too strict code quality gates can slow down the development process and frustrate developers. It is important to strike a balance between enforcing quality standards and maintaining developer productivity.

For example, it should be possible to bypass code quality checks in exceptional cases. However, *"technical debt"* management practices should be in place to ensure that these exceptions eventually get addressed.

There are two main aspects of enforcing quality gates:

1. Make sure that code quality is enforced, so it is not possible to merge code that does not meet the quality standards.
2. Keep the feedback loop as short as possible, so developers can fix the issues as soon as possible. ❗ Beware, developers will rebel against quality gates if it impacts their productivity and developer experience (DevEX).

### Developer Feedback Loop

Quality gates should provide feedback to developers as soon as possible. But it is important to strike a balance between providing feedback and not overwhelming developers with too many notifications and increased compilation times.

We can implement quality gates at various stages of the inner development loop:

1. 📝IDE/Linter
2. 🪝Pre-commit hooks
3. ⚙️CI/CD
    1. Build
    2. Automated tests (unit, integration, end-to-end, performance, etc.)
    3. Code quality checks
    4. Security checks
4. 🤼Code Review

The more important the check, the earlier it should be in the development loop. For example, it is better to catch syntax errors and formatting issues in the IDE or pre-commit hooks rather than in the CI/CD pipeline.

## Code Quality Aspects

There are several aspects of code quality that can be enforced by quality gates:

- Consistent formatting
- Consistent code style
- High code quality
- No code smells
- No spelling mistakes
- No security vulnerabilities
- No performance issues
- No bugs

### Code Formatting

I prefer [csharpier](https://csharpier.com/), because it is fast and has a good default configuration. It is an opinionated code formatter for C#. It is similar to Prettier, and the [philosophy](https://prettier.io/docs/en/option-philosophy.html) is to have a single way to format the code.

Personally, I don't want to spend time discussing code formatting in code reviews. I want to have a single way to format the code, and I want to have it done automatically.

The only option you can argue about is the line length. The default line length is 120 characters, but you can change it to 80 characters if you prefer.

### Spelling

Spelling mistakes can be detected by the `cspell linter`. It is a fast and configurable spell checker that runs in the terminal.

### Coding Style and Code Analysis

Coding style can be enforced by standard (Roslyn) analyzers. Code analysis rules have various configuration options. Some of these options are specified as key-value pairs in an analyzer configuration file (`.editorconfig`).

You can configure the severity level for any rule, including [code quality](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/) rules and [code style](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/) rules. For example, to enable a rule as a warning, add the following key-value pair to an analyzer configuration file:

```ini
[*.{cs,vb}]
# IDE0040: Accessibility modifiers required
dotnet_diagnostic.IDE0040.severity = warning
# or
# IDE0040: Accessibility modifiers required
dotnet_style_require_accessibility_modifiers = always:warning
```

.NET compiler platform  analyzers inspect your code for code quality and style issues. Starting in .NET 5, these analyzers are included with the .NET SDK and you don't need to install them separately.

While the .NET SDK includes all code analysis rules, only some of them are enabled [by default](https://github.com/dotnet/roslyn-analyzers/blob/main/src/NetAnalyzers/Core/AnalyzerReleases.Shipped.md). The analysis mode determines which, if any, set of rules to enable. You can choose a more aggressive analysis mode where most or all rules are enabled - `<AnalysisMode>All</AnalysisMode>`.

There are two other options to enforce coding style I would like to mention:

* [TreatWarningsAsErrors](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings#treatwarningsaserrors) - All warning messages are instead reported as errors. The build process halts (no output files are built).
* [EnforceCodeStyleInBuild](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props#enforcecodestyleinbuild) - .NET code style analysis is disabled, by default, on build for all .NET projects.

From my experience, it can negatively impact the local build time, so I prefer to run the checks in the CI/CD pipeline.

💡 The only exception to this is to use `<WarningsAsErrors>Nullable</WarningsAsErrors>` to treat nullable warnings as errors.

---

There is a way to write your own *custom analyzers*. You can use the [Roslyn SDK](https://github.com/dotnet/roslyn-sdk) to create custom rules and code fixes. It is a great way to enforce custom coding standards and best practices used in your organization.

⭐ Additionally, you may consider the following analyzers created by the community:

* <https://github.com/SonarSource/sonar-dotnet>
* <https://github.com/dotnet/roslynator>
* <https://github.com/bkoelman/CSharpGuidelinesAnalyzer>
* <https://github.com/meziantou/Meziantou.Analyzer>
* <https://github.com/SergeyTeplyakov/ErrorProne.NET>

☝️ Note, you don't have to adopt analyzers entirely. You can use only the rules that make sense for your project.

🧠 My suggestion is to work on the code quality and code style rules together with the team during the code review process. The rules should be discussed and agreed upon by the team.

### Code Analysis Tools

If you want to go further, you can use code analysis tools. The difference between code analysis tools and code analyzers is that code analysis tools are external tools that analyze your codebase and provide insights into the quality of your code.

Some of the popular tools are:

* [SonarCloud](https://sonarcloud.io/) - SonarCloud is a cloud-based code analysis service that automatically detects bugs, vulnerabilities, and code smells in your code. It integrates with GitHub, Azure DevOps, and Bitbucket.
* [CodeQL](https://securitylab.github.com/tools/codeql) - CodeQL is a semantic code analysis engine that allows you to write queries to find vulnerabilities in your code.
* [NDepend](https://www.ndepend.com/) - NDepend is a static analysis tool that helps you manage complex .NET codebases and achieve high code quality.

Here is an example of a SonarCloud report:

<center>
  <img src="/assets/quality-gates/sonar.png" style="margin: 15px;" width="100%">
</center>

💡 You can include `SonarCloud` check as part of a CI/CD pipeline. Use `/d:sonar.qualitygate.wait=true` option. Otherwise, the CI/CD pipeline will not wait for the SonarCloud analysis to finish.

By default, Sonar configures pretty strict rules called "Sonar Way":

<center>
  <img src="/assets/quality-gates/sonar-way.png" style="margin: 15px;" width="100%">
</center>

👎 The downside of using different code analysis tools is that you have to configure them separately. You have to configure the rules, the severity levels, and the exclusions. Ideally, I want to have a single configuration file (aka source of truth) that configures all the code quality checks.

## Demo

Check out the example I've prepared - <https://github.com/NikiforovAll/quality-gateways-demo-dotnet>

🎯 This project, demonstrates how to enforce quality gates in a .NET project using the following tools:

- [Code Analysis](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview) - .NET compiler platform (Roslyn) analyzers (shipped as part of the .NET SDK).
- [SonarAnalyzer.CSharp](https://rules.sonarsource.com/csharp/) - Custom analyzers for C# that are part of SonarCloud.
- [CSharpier](https://csharpier.com/) - CSharpier is an opinionated code formatter for C#.
- [cspell](https://streetsidesoftware.github.io/cspell/) - cspell is a command line tool that checks the spelling of your code.
- [Husky.Net](https://alirezanet.github.io/Husky.Net/) - Husky.Net is a .NET tool that allows you to run tasks before committing the code.
- [GitHub Actions](https://docs.github.com/en/actions) - Automate, customize, and execute your software development workflows.
- [SonarCloud](https://sonarcloud.io/) - SonarCloud is a cloud-based code analysis service that automatically detects bugs, vulnerabilities, and code smells in your code.

---

Assume we have initial code that does not meet the quality standards.

<center>
  <img src="/assets/quality-gates/code-before.png" style="margin: 15px;" width="100%">
</center>

1. First of all, the developer will receive feedback from the IDE and linter.
2. Before committing the code, [Husky.NET](https://alirezanet.github.io/Husky.Net/) will run pre-commit hooks. And if any of the checks fail, the commit will be rejected.
3. The CI/CD pipeline will run the same checks (and maybe other checks such as automated tests). And if any of the checks fail, the pipeline will fail.

Prerequisites:

- `dotnet tool restore` - installs `husky`, `csharpier`
- `npm install -g cspell`

The benefit of using `Husky.NET` is that it allows you to run pre-commit hooks in a cross-platform way. It is a .NET port of the popular `husky` tool for Node.js.

Let's run it locally to see how it works:

```bash
dotnet run husky
```

This command runs the following checks sequentially:

```json
{
    "$schema": "https://alirezanet.github.io/Husky.Net/schema.json",
    "tasks": [
        {
            "name": "format",
            "group": "pre-commit",
            "command": "dotnet",
            "args": ["csharpier", ".", "--check"]
        },
        {
            "name": "style",
            "group": "pre-commit",
            "command": "dotnet",
            "args": ["format", "style", ".", "--verify-no-changes"]
        },
        {
            "name": "analyzers",
            "group": "pre-commit",
            "command": "dotnet",
            "args": ["format", "analyzers", ".", "--verify-no-changes"]
        },
        {
            "name": "spelling",
            "group": "pre-commit",
            "command": "cspell",
            "args": ["lint", "**.cs", "--no-progress", "--no-summary"]
        }
    ]
}
```

We can run the checks individually:

```bash
dotnet husky run --name format
```

```bash
dotnet husky run --name style
```

```bash
dotnet husky run --name analyzers
```

```bash
dotnet husky run --name spelling
```

Now, assume the developer ignores the warning and somehow commits the code and creates a pull request. The CI/CD pipeline will run the same checks, and if any of the checks fail, the pipeline will fail.

💡 I configured parallel execution for code quality gates, which helps to receive feedback faster.

<center>
  <img src="/assets/quality-gates/ci-cd-failed.png" style="margin: 15px;" width="100%">
</center>

Now let's fix the issues, by running "quick code fixes" (`ctrl + .`) in the IDE.

```csharp
string filePath = "path/to/your/file.txt";

using var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
using var reader = new StreamReader(fileStream);
var lines = new List<string>();

while (!reader.EndOfStream)
{
    var line = await reader.ReadLineAsync();

    if (string.IsNullOrWhiteSpace(line))
    {
        continue;
    }

    lines.Add($"{Guid.NewGuid()} - {line}[{CountCapitalLetters(line)}]");
}

foreach (string line in lines)
{
    Console.WriteLine(line);
}

// Counts the number of capital letters in a string
static int CountCapitalLetters(string input)
{
    return input.Count(char.IsUpper);
}
```

🔁 And run the checks again.

```bash
❯ dotnet husky run
[Husky] 🚀 Loading tasks ...
--------------------------------------------------
[Husky] ⚡ Preparing task 'format'
[Husky] ⌛ Executing task 'format' ...
Formatted 1 files in 952ms.
[Husky]  ✔ Successfully executed in 2,307ms
--------------------------------------------------
[Husky] ⚡ Preparing task 'style'
[Husky] ⌛ Executing task 'style' ...
[Husky]  ✔ Successfully executed in 15,299ms
--------------------------------------------------
[Husky] ⚡ Preparing task 'analyzers'
[Husky] ⌛ Executing task 'analyzers' ...
[Husky]  ✔ Successfully executed in 12,293ms
--------------------------------------------------
[Husky] ⚡ Preparing task 'spelling'
[Husky] ⌛ Executing task 'spelling' ...
[Husky]  ✔ Successfully executed in 2,802ms
--------------------------------------------------
```

💡 Note: The pre-commit hook takes about 30 seconds. This is already too long, so we might consider removing something from the git hook and relying only on the CI/CD.

Now, we commit the changes and push them to the repository. The CI/CD pipeline will run the checks again, and if all checks pass, the pipeline will succeed.

<center>
  <img src="/assets/quality-gates/ci-cd-success.png" style="margin: 15px;" width="100%">
</center>

## Conclusion

Enforcing code quality gates is an important part of maintaining a high-quality codebase. It helps catch issues early in the development process, reducing the likelihood of bugs and technical debt.

> 🙌 I hope you found it helpful. If you have any questions, please feel free to reach out. If you'd like to support my work, a star on GitHub would be greatly appreciated! 🙏

## References

- <https://alirezanet.github.io/Husky.Net/>
- <https://csharpier.com/>
- <https://docs.sonarsource.com/sonarcloud/>
- <https://rules.sonarsource.com/csharp/>
- <https://github.com/bkoelman/CSharpGuidelinesAnalyzer>
- <https://github.com/streetsidesoftware/cspell>
- <https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-options>
- <https://microsoft.github.io/code-with-engineering-playbook/developer-experience/>
