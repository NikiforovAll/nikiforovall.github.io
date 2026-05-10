---
layout: post
title: "Prompt Engineering with GitHub Copilot in Visual Studio Code"
categories: [ productivity ]
tags: [ productivity, ai, copilot, agents ]
published: true
shortinfo: "Learn how to leverage reusable prompts in GitHub Copilot to enhance your productivity in Visual Studio Code."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

Learn how to leverage reusable prompts in GitHub Copilot to enhance your productivity in Visual Studio Code.

**Source code:** <https://github.com/NikiforovAll/dotnet-copilot-rules>

## Introduction

Prompt engineering in the right context can be a very powerful technique when working with LLMs.

In this blog post, I will not dive into the details of prompt engineering. For more information on prompt engineering, check out the [Prompt Engineering Guide](https://www.promptingguide.ai/techniques).

**Why Prompt Engineering?**

In the context of *Visual Studio Code* and *GitHub Copilot*, prompt engineering allows developers to create reusable instructions that streamline workflows, enforce coding standards, and improve collaboration. By leveraging [reusable prompts](https://code.visualstudio.com/docs/copilot/copilot-customization), you can enhance Copilot's ability to produce meaningful suggestions tailored to your specific needs.

## Reusable Prompt Files in GitHub Copilot

GitHub Copilot introduces the concept of **reusable prompt files**. These files allow you to define task-specific instructions in a structured and reusable way.

You can define prompts at the workspace level, making them accessible to all team members. Or you can create them at the user level, making them available across all your projects.

### Setting Up Reusable Prompt Files for Workspaces

**Enable Prompt Files**:

- Open your `.vscode/settings.json`
- Set the `chat.promptFiles` setting to `true` to enable reusable prompt files.

```json
{
   "chat.promptFiles": true,
   "chat.promptFilesLocations": {
      ".github/prompts": true,
      ".vscode/prompts": true
   }
}
```

Now you can create a folder named `.github/prompts` or `.vscode/prompts` in your workspace. Inside this folder, you can create prompt files with the `.prompt.md` extension.

Later, you can attach these prompt files as context to your prompt.

### Example

Here is an example of my `pros-and-cons.prompt.md` file:

```markdown
---
description: Pros and Cons Analysis
---
# Definition:
Analyze the proposed solution, focusing on its strengths and weaknesses. Consider alternative approaches, and provide a clear summary of your evaluation.

## Constraints
- Ask follow-up questions if needed to clarify the solution. 
- If any questions arise, wait for the user to respond before proceeding with the analysis.
- Provide Pros and Cons in a bulleted list format.
- Highlight best practices and common pitfalls, where relevant.
- Suggest alternative solutions or improvements, if applicable.
- Provide pros and cons for alternative solutions if applicable. Provide at least 3 pros and cons for each alternative solution.
- Use provided emojis below to enhance readability:
- Use ✅ to highlight pros in the list.
- Use ❌ to indicate cons in the list.
- Use ✨ to highlight best practice items in the list.
- Use ☝️ to indicate common pitfalls.
- Use 🔒 to highlight security (InfoSec)-related topics.
- End with a single-paragraph summary of your overall assessment.

## Structure
- **Proposed Solution**: <NAME>
- **Description**: <DESCRIPTION>
- **Pros**:
- **Cons**:
- **Best Practices**:
- **Common Pitfalls**:

- **Alternative Solution**: <NAME>
- **Description**: <DESCRIPTION>

- **Pros**:
- **Cons**:

<!-- ... -->
```

### 🚀 Demo

Let's say we want to implement Basic Authentication in some application. We can use the `pros-and-cons.prompt.md` file to analyze the proposed solution.

<center>
    <video src="https://github.com/user-attachments/assets/bd83ee0f-79a2-48f3-904b-2c31ffd97cb1"
        width="90%"
        controls="controls" />
</center>

💡 The great thing about this is that you can tailor the prompt to your specific needs.

## Other Use Cases
1️⃣ **[Generated Knowledge Prompting](https://www.promptingguide.ai/techniques/knowledge)**: Rather than including every detail in your initial prompt, you can instruct Copilot to ask clarifying questions. Your responses to these questions are then incorporated as context, enabling Copilot to generate more accurate and relevant code.

For example, here is my `qa.prompt.md` file:

```markdown
---
description: Q&A Session
---
# Definition
Ask me a series of yes/no questions to better understand my needs and give a more accurate recommendation.

## Constraints
- Follow best practices, suggest best practices, and avoid common pitfalls.
- The questions should be relevant to the topic at hand.
- The questions should be clear and concise.
- Ask questions in batches of 5.
- Do not ask more than 5 questions.
- Ask all questions in one go.
- Do not proceed without my answer.
```

2️⃣ **Generate Repeatable Code Constructs**. Assume you have a specific approach to adding CRUD operations to your application. You can create a reusable prompt file that describes the process and use it in Agent mode to generate the whole feature.

3️⃣ **Prompts as Artifacts**. Instead of writing in the chat window directly, you can carefully craft the prompt file with necessary requirements and use it to generate the new feature. As a result, not only do you get things done, but you also have a nice artifact for future reference.

## Conclusion

> 🙌 I hope you found it helpful. If you have any questions, please feel free to reach out. If you'd like to support my work, a star on GitHub would be greatly appreciated! 🙏

## References

- [Prompt engineering for Copilot Chat](https://code.visualstudio.com/docs/copilot/chat/prompt-crafting)
- [GitHub Copilot Customization](https://code.visualstudio.com/docs/copilot/copilot-customization#_reusable-prompt-files-experimental)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)