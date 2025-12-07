---
layout: post
title: "LazyClaude: Explore Your Claude Code Setup Without Breaking Flow"
categories: [ ai ]
tags: [ claude, python, productivity, developer-tools ]
published: true
shortinfo: "A lazygit-inspired TUI to browse all your Claude Code customizations"
fullview: false
comments: true
related: true
---

## TL;DR

Claude Code's customization system is powerful but scattered across multiple files and configuration levels. **LazyClaude** is a lazygit-inspired terminal UI that lets you explore all your customizations—slash commands, agents, skills, MCPs, hooks, and memory files—in one place. Filter by level (user/project/plugin), search by name, and navigate with vim-style keybindings.

<div style="display: flex; align-items: center; justify-content: center; gap: 1.5rem; margin: 1rem 0;">
<img src="/assets/lazyclaude/logo.png" alt="LazyClaude logo" width="60"/>
<div>
<p style="margin: 0; padding: 0.5rem 0;"><strong>Source:</strong> <a href="https://github.com/NikiforovAll/lazyclaude">github.com/NikiforovAll/lazyclaude</a></p>
<p style="margin: 0; padding: 0.5rem 0;"><strong>Install:</strong> <code>uvx lazyclaude</code></p>
</div>
</div>

---

## Introduction

Claude Code has a rich customization system. You can define custom slash commands, create specialized agents, configure MCP servers, set up hooks, and write memory files that shape how Claude understands your project. The problem? These customizations live in different places:

- `~/.claude/` for user-level configuration
- `.claude/` for project-specific settings
- Plugin directories for third-party extensions

When you need to find a specific command or understand what's available, you're left running `/help`, `/mcp`, `/agents`, or opening files one by one. Each lookup interrupts your flow.

**LazyClaude** solves this by providing a dedicated terminal UI where you can browse all your Claude Code customizations without leaving your workflow.

<center>
<img src="/assets/lazyclaude/demo.png" alt="LazyClaude main interface"/>
</center>


## What is LazyClaude?

LazyClaude is a terminal user interface that follows the design philosophy of [lazygit](https://github.com/jesseduffield/lazygit): keyboard-driven, panel-based, and focused on getting information quickly.

<center>
<img src="/assets/lazyclaude/demo.gif" alt="LazyClaude demo showing terminal UI"/>
</center>

---

See [README](https://github.com/NikiforovAll/lazyclaude#readme) for more details.

## Getting Started

Install with [uv](https://docs.astral.sh/uv/):

```bash
uvx lazyclaude
```

## Conclusion

LazyClaude brings visibility to Claude Code's configuration system. Instead of hunting through files or interrupting your workflow with help commands, you get a dedicated window showing everything at a glance.

It's keyboard-first, fast, and stays out of your way—exactly what a developer tool should be.

**Source code:** <https://github.com/NikiforovAll/lazyclaude>

Contributions welcome. Try it, break it, and let me know what customizations you discover.

## References

- [LazyClaude - GitHub Repository](https://github.com/NikiforovAll/lazyclaude)
- [Textual - Python TUI Framework](https://textual.textualize.io/)
- [lazygit - Terminal UI for git](https://github.com/jesseduffield/lazygit)
- [Claude Code Documentation](https://code.claude.com/docs)
