---
layout: post
title: "Code Review with GitHub Copilot in Visual Studio Code"
categories: [ productivity ]
tags: [ productivity, ai, copilot ]
published: true
shortinfo: "In this blog post, I will show you how to leverage GitHub Copilot's code review capabilities in Visual Studio Code. In addition to the built-in features, I'll introduce my own agent-based code review workflow using a custom prompt."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

- [TL;DR](#tldr)
- [Introduction](#introduction)
- [Code Review Custom Instructions](#code-review-custom-instructions)
- [Code Review in Agent Mode](#code-review-in-agent-mode)
  - [Crafting the Review Prompt](#crafting-the-review-prompt)
  - [Demo](#demo)
- [Conclusion](#conclusion)
- [References](#references)

In this blog post, I will show you how to leverage GitHub Copilot's code review capabilities in Visual Studio Code. In addition to the built-in features, I'll introduce my own agent-based code review workflow using a custom prompt. This approach leverages Copilot's flexibility to tailor the review process to your team's needs.

**Source code:** <https://github.com/NikiforovAll/dotnet-copilot-rules>

## Introduction

*Code review* has always been a cornerstone of high-quality software development, but its importance has only grown with the advent of LLM-based development tools like GitHub Copilot. As AI-generated code becomes more prevalent, careful reading and thorough review are essential to ensure correctness, maintainability, and security.

🤖 With the latest updates, Copilot code review is seamlessly integrated into Visual Studio Code, providing instant, AI-powered feedback directly in your editor.

Some of the key features include:

- **Review Selection:** Highlight any section of code and request an initial review. Copilot will analyze the selected code and provide feedback, including suggestions for improvements or fixes, which you can apply with a single click.
- **Review Changes:** Request a deeper review of all your staged or unstaged changes directly from the Source Control tab. Copilot will review your modifications and surface comments or suggestions inline and in the Problems tab.

📃 Find out more about these features in the [GitHub Copilot documentation](https://docs.github.com/en/copilot/using-github-copilot/code-review/using-copilot-code-review?tool=vscode).

## Code Review Custom Instructions

I already described how to ground Copilot Code Review with custom instructions in my previous post - [Enforcing .NET Coding Guidelines with GitHub Copilot Custom Instructions](https://nikiforovall.github.io/productivity/2025/03/08/github-copilot-instructions-for-dotnet.html). Basically, it boils down to something like this:

```json
{
    "github.copilot.chat.reviewSelection.enabled": true,
    "github.copilot.chat.reviewSelection.instructions": [
        {
            "file": ".vscode/rules/csharp/coding-guidelines.md"
        }
    ]
}
```

## Code Review in Agent Mode

Beyond the built-in features, I've crafted a custom code review prompt designed for agent mode. This approach aims to replicate the functionality of the [Pull Request Review from Copilot](https://docs.github.com/en/copilot/using-github-copilot/code-review/using-copilot-code-review?tool=webui#requesting-a-pull-request-review-from-copilot).

While the standard Copilot Pull Request Review is excellent, it has certain limitations:

- It's restricted to the Web UI, requiring users to leave their IDE.
- It cannot be used outside the GitHub environment.
- It offers less capability compared to the Agent mode, which allows for the use of MCPs, model switching, etc.

> 🎯 To address these limitations, I suggest you to try out my custom code review prompt. This prompt is designed to be used in the agent mode, allowing you to leverage the full power of Copilot while keeping your workflow within Visual Studio Code.

### Crafting the Review Prompt

Here is the prompt I use for code reviews:

🚀 <https://github.com/NikiforovAll/dotnet-copilot-rules/blob/main/.vscode/prompts/code-review.prompt.md>

The prompt has two logical sections:

1. **Description**: This section describes the purpose of the prompt and sets the context for the review.
    ```markdown
    ---
    description: Perform a code review
    ---
    ## Code Review Expert: Detailed Analysis and Best Practices

    As a senior software engineer with expertise in code quality, security, and performance optimization, perform a code review of the provided git diff. 

    Focus on delivering actionable feedback in the following areas: (Skipped for brevity)

    Format your review using clear sections and bullet points. Include inline code references where applicable.

    Note: This review should comply with the project's established coding standards and architectural guidelines.
    ```
2. **Constraints**: This section outlines the specific constraints and guidelines that the code should adhere to.
    ```markdown
    ## Constraints

    * **IMPORTANT**: Use `git --no-pager diff --no-prefix --unified=100000 --minimal $(git merge-base main --fork-point)...head` to get the diff for code review.
    * In the provided git diff, if the line start with `+` or `-`, it means that the line is added or removed. If the line starts with a space, it means that the line is unchanged. If the line starts with `@@`, it means that the line is a hunk header.

    * Use markdown for each suggestion, like
        ```
        # Code Review for ${feature_description}
        Overview of the code changes, including the purpose of the feature, any relevant context, and the files involved.

        # Suggestions
        ## ${code_review_emoji} ${Summary of the suggestion, include necessary context to understand suggestion}
        * **Priority**: ${priority: (🔥/⚠️/🟡/🟢)}
        * **File**: ${relative/path/to/file}
        * **Details**: ...
        * **Example** (if applicable): ...
        * **Suggested Change** (if applicable): (code snippet...)
        
        ## (other suggestions...)
        ...

        # Summary
        ```
    * Use the following emojis to indicate the priority of the suggestions:
        * 🔥 Critical
        * ⚠️ High
        * 🟡 Medium
        * 🟢 Low
    * Each suggestion should be prefixed with an emoji to indicate the type of suggestion:
        * 🔧 Change request
        * ❓ Question
        * ⛏️ Nitpick
        * ♻️ Refactor suggestion
        * 💭 Thought process or concern
        * 👍 Positive feedback
        * 📝 Explanatory note or fun fact
        * 🌱 Observation for future consideration
    ```

Basically, we ask Copilot to get the diff by running the `git diff` command and perform a code review based on the output from the terminal.

```bash
git --no-pager diff --no-prefix --unified=100000 --minimal $(git merge-base main --fork-point)...head
```

### Demo

Let's say we have a simple program that counts the number of capital letters in each line of a text file. We can use the `code-review.prompt.md` file to analyze the proposed solution.

```csharp
string filePath = "path/to/your/file.txt";

FileStream fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);

StreamReader reader = new StreamReader(fileStream);
List<string> lines = new List<string>();

while (!reader.EndOfStream)
{
    string line = await reader.ReadLineAsync();
    lines.Add($"{new Guid()} - {line}[{CountCapitalLetters(line)}]");
}

foreach (string line in lines)
{
    Console.WriteLine(line);
}

// Counts the number of capital latters in a string, the typo in word 'latters' is intentional
int CountCapitalLetters(string input, string param1 = default, int param2 = 0, bool param3 = false, object param4 = null)
{
    int count = 0;
    foreach (char c in input)
    {
        if (char.IsUpper(c))
        {
            count++;
        }
    }

    return count;
}
```

We can attach the prompt by `CTRL + ALT + /` and select the `code-review.prompt.md` file. Then, we can ask Copilot to follow the instructions in the prompt and perform a code review.

<center>
    <video src="https://github.com/user-attachments/assets/950ef85f-91eb-4b28-a882-b30e6d964fcb"
        width="90%"
        controls="controls" />
</center>

---

✅ And here is the result of the code review:

<center>
  <img src="/assets/github-copilot-instructions-for-dotnet/custom-code-review-demo.png" />
</center>

---

I would say that the review is quite good. It is a good starting point to keep chatting with Copilot and ask for more details, or even to ask it to rewrite the code based on the suggestions.

💡 The great thing about this is that you can tailor the prompt to your specific needs. You can add or remove sections, change the wording, reference the project's coding standards, etc.

💡 Treat Copilot as a coworker: start "Voice Chat" mode and engage in a conversation just as you would with a teammate. Ask questions, discuss suggestions, and iterate on solutions together to get the most out of your code review.

## Conclusion

> 🙌 I hope you found it helpful. If you have any questions, please feel free to reach out. If you'd like to support my work, a star on GitHub would be greatly appreciated! 🙏

## References

- [Prompt engineering for Copilot Chat](https://code.visualstudio.com/docs/copilot/chat/prompt-crafting)
- [GitHub Copilot Customization](https://code.visualstudio.com/docs/copilot/copilot-customization#_reusable-prompt-files-experimental)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [Using GitHub Copilot code review](https://docs.github.com/en/copilot/using-github-copilot/code-review/using-copilot-code-review?tool=vscode)