---
layout: post
title: "Enforcing .NET Coding Guidelines with GitHub Copilot Custom Instructions"
categories: [ productivity ]
tags: [ productivity, ai, copilot, dotnet ]
published: true
shortinfo: "Learn how to setup GitHub Copilot to follow your coding guidelines (aka custom instructions). I've created a repository with a set of rules for .NET development that you can use as a starting point."
fullview: false
comments: true
related: true
mermaid: false
---

## TL;DR

Using GitHub Copilot with custom instructions can improve the quality of generated code by enforcing coding guidelines. I will show you how to use GitHub Copilot [custom instructions](https://code.visualstudio.com/docs/copilot/copilot-customization#_define-codegeneration-custom-instructions) in the context of .NET development. You can use my repository with a set of rules as a starting point.

**Source code:** <https://github.com/NikiforovAll/dotnet-copilot-rules>

<center>
  <img src="/assets/github-copilot-instructions-for-dotnet/dotnet-copilot-rules-repo.png" style="margin: 15px;" width="60%" />
</center>

## Introduction

If you want to build a successful and maintainable project, ensuring your code is clean, maintainable, and idiomatic is crucial. This is where *coding guidelines* come into play.

Coding guidelines promote consistency, readability, and maintainability within a project. Documenting these guidelines helps developers adhere to best practices, streamline collaboration, and minimize technical debt.

As AI coding tools and agents become integral team members, clear coding guidelines are more important than ever. These tools assist in generating, refactoring, and reviewing code, but they rely on well-defined rules to align with project standards. Documenting coding guidelines provides essential context, ensuring AI-generated code maintains consistency, readability, and best practices. Without structured rules, AI contributions may introduce inconsistencies, increasing technical debt and maintenance overhead.

## Configure

To configure GitHub Copilot to follow your coding guidelines, you can use the [custom instructions](https://code.visualstudio.com/docs/copilot/copilot-customization#_define-codegeneration-custom-instructions) feature. This allows you to define specific rules and preferences for code generation.

Here is an example of my [custom instructions](https://github.com/NikiforovAll/dotnet-copilot-rules) configuration:

```json
{
    "github.copilot.chat.codeGeneration.instructions": [
        {
            "file": ".vscode/rules/csharp/coding-guidelines.md"
        },
        {
            "file": ".vscode/rules/csharp/coding-style.md"
        }
    ],
    "github.copilot.chat.reviewSelection.enabled": true,
    "github.copilot.chat.reviewSelection.instructions": [
        {
            "file": ".vscode/rules/csharp/coding-guidelines.md"
        },
        {
            "file": ".vscode/rules/csharp/coding-style.md"
        }
    ],
    "github.copilot.chat.testGeneration.instructions": [
        {
            "file": ".vscode/rules/csharp/testing-xunit.md"
        }
    ],
    "github.copilot.chat.commitMessageGeneration.instructions": [
        {
            "file": ".vscode/rules/git-message.md"
        }
    ],
    "chat.promptFiles": true,
    "chat.promptFilesLocations": {
        ".github/prompts": true,
        ".vscode/prompts": true
    },
}
```

Now, we can add as many files as we want to the `.vscode/rules` folder. The file could be in any format, but I recommend using Markdown for better readability. The files should contain the rules you want Copilot to follow.

For example, here is `.vscode/rules/coding-guidelines.md` file with coding guidelines:

```markdown
---
description: This file provides guidelines for writing clean, maintainable, and idiomatic C# code with a focus on functional patterns and proper abstraction.
---
# Role Definition:

- C# Language Expert
- Software Architect
- Code Quality Specialist

## General:

**Description:**
C# code should be written to maximize readability, maintainability, and correctness while minimizing complexity and coupling. Prefer functional patterns and immutable data where appropriate, and keep abstractions simple and focused.

**Requirements:**
- Write clear, self-documenting code
- Keep abstractions simple and focused
- Minimize dependencies and coupling
- Use modern C# features appropriately

## Code Organization:

- Use meaningful names:
    ```csharp
    // Good: Clear intent
    public async Task<Result<Order>> ProcessOrderAsync(OrderRequest request, CancellationToken cancellationToken)
    
    // Avoid: Unclear abbreviations
    public async Task<Result<T>> ProcAsync<T>(ReqDto r, CancellationToken ct)
    ```

<!-- And so on... -->
```

## Practice

🤖 Let's see how it works in practice. Here is a result of simple prompt: *"Generate fizz buzz"*:

<center>
  <img src="/assets/github-copilot-instructions-for-dotnet/example-code-gen.png" style="margin: 15px;" width="80%" />
</center>

As you can see, two additional files were used to generate the code:

- `.vscode/rules/csharp/coding-guidelines.md` - contains coding guidelines
- `.vscode/rules/csharp/coding-style.md` - contains coding style rules

The generated code is something that I would expect from a developer who follows the rules. ☝️

🧠 Here are my findings after using this setup for a little while:

- In practice, if you have too many rules it may degrade the overall quality of generated code or make copilot hallucinate
- It is definitely easier to tell Copilot what to do rather than what not to do (LLMs are not good at negations)
- Copilot is not perfect, but it is getting better. I would say that ~ 70% of the time it generates code that follows the rules.
- We want to have rules understandable by both humans and Copilot, sometimes it is hard to strike a balance

## Conclusion

Using GitHub Copilot with custom instructions can significantly improve the quality of generated code by enforcing coding guidelines. This approach has a lot of potential and is worth investing time in. With the advancement of LLMs and GitHub Copilot, I expect even better results in the future. 🚀


## References

- <https://github.com/NikiforovAll/dotnet-copilot-rules>
- <https://github.com/Aaronontheweb/dotnet-cursor-rules>
- <https://code.visualstudio.com/docs/copilot/copilot-customization>
