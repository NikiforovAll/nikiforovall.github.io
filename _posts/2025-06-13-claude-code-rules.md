---
layout: post
title: "My Claude Code Usage Best Practices and Recommendations"
categories: [ productivity]
tags: [ productivity, ai, claude, agents]
shortinfo: "Practical recommendations and principles for using Claude Code."
published: true
fullview: false
comments: true
related: true
mermaid: true
---

This post shares my collection of practical recommendations and principles for using Claude Code. For more details and the full source code, check out my repository:

**Source code:** [github.com/NikiforovAll/claude-code-rules](https://github.com/NikiforovAll/claude-code-rules)

---

## Practical Recommendations

Here is my list of practical recommendations for using Claude Code:

### Planning

- Ask Claude to brainstorm ideas and iterate on them. Later, these ideas can be used as grounding context for your prompts.
- `plan mode` vs `auto-accept mode` vs `edit mode`:
  - Verify what is about to be performed using `plan mode`.
  - Once verified, proceed with `auto-accept mode`.
  - Step-by-step mode is the default mode with no auto-accept.
- Workflows:
  - a. Explore, plan, code, commit.
  - b. Write tests, commit; code, iterate, commit.
  - c. Write code, screenshot results, iterate.
- Ask “think hard” to trigger deep thinking:
  - "think" < "think hard" < "think harder" < "ultrathink"

#### AI Task-Based Development

- Write a plan to an external source (e.g., file - plan.md) and use it as a checklist.
- `plan.prompt.md` - use an external file as memory for task management and planning.

I've created a set of commands to help with AI task-based development:

- Use `/create-prd` to create a Product Requirements Document (PRD) based on user input.
- Use `/generate-tasks` to create a task list from the PRD.
- Use `/process-task-list` to manage and track task progress.

Project structure looks like this:

```bash
tree -a
# .
# ├── .claude
# │   ├── commands
# │   │   ├── create-prd.md
# │   │   ├── generate-tasks.md
# │   │   └── process-task-list.md
# │   └── settings.local.json
# ├── .mcp.json
# └── README.md
```

For more details, please refer to [source code](https://github.com/NikiforovAll/claude-code-rules).

### Knowledge Mining / Grounding

- Use the `/init` command to initialize the `CLAUDE.md` file. There’s no required format for `CLAUDE.md` files. I recommend keeping it concise and human-readable. You can use it to store important information about your project, such as architecture, design decisions, and other relevant details that can help Claude understand your codebase better.
- `CLAUDE.md` can open other files like this: `@path/to/import`. Be careful, as this file is attached every time you submit a prompt.
- There are two different types:
  - Project memory `./CLAUDE.md` - share it with your team.
  - User memory `~/.claude/CLAUDE.md` - personal preferences.
- You can use `# <text>` to add particular memory to the `CLAUDE.md` file.
- Use `/memory` to edit the memory file directly. It will open the file in your default editor.

- Codebase Q&A: Use Claude Code to ask questions about your codebase. It can help during onboarding or when you need to understand how something works.
- Use hints, reference files, provide examples, mention documentation, and provide links.

### Miscellaneous

- Use in “pipe” mode, as Unix philosophy utils: `claude -p ""` or `echo '' | claude -p ""`.
- 🗑️ `/clear` and `/compact <specific prompt for aggregation>` can be very helpful.
- 🧠 If you don’t know something about Claude Code, ask it! It’s self-aware.
  - E.g., What kind of tools do you have? Can you perform a web search?

## MCP Servers

You can use MCP servers. See [claude-code/mcps](https://docs.anthropic.com/en/docs/claude-code/mcps).

Here is an example of how to setup MCP servers, just create a `.mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "microsoft.docs.mcp": {
      "type": "http",
      "url": "https://learn.microsoft.com/api/mcp"
    },
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp@latest"
      ]
    }
  }
}
```

#### 🎁 Bonus: Turn Claude Code into an Interactive Tutor with Microsoft Docs & Context7

You can supercharge Claude Code by integrating it with Microsoft Docs and Context7. It can be useful for learning and development tasks.

<center>
    <video src="https://github.com/user-attachments/assets/d2ee949d-4945-4d31-a1c2-3ebfa0ccde17"
        width="90%"
        controls="controls" />
</center>

## Useful Links

- ⭐ Learn best practices for Claude Code: [engineering/claude-code-best-practices](https://www.anthropic.com/engineering/claude-code-best-practices).
- ⭐ Tutorials - <https://docs.anthropic.com/en/docs/claude-code/tutorials>
- Explore common use cases for Claude Code: [claude-code/common-tasks](https://docs.anthropic.com/en/docs/claude-code/common-tasks).
- CLI Usage - <https://docs.anthropic.com/en/docs/claude-code/cli-usage>
- Claude Code Memory - <https://docs.anthropic.com/en/docs/claude-code/memory>
- General Prompt Engineering with Claude Models - <https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview>
- Interactive Tutorial for Prompt Engineering - <https://github.com/anthropics/prompt-eng-interactive-tutorial>


---

If you have questions or want to see more, check out the [GitHub repository](https://github.com/NikiforovAll/claude-code-rules) or leave a comment below!
