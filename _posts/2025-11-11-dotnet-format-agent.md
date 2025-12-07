---
layout: post
title: "Transform .NET Diagnostics into a Specialized AI Agent with Claude Agent SDK"
categories: [ dotnet, ai ]
tags: [ dotnet, ai, agents, claude, cli, code-quality, mcp, developer-tools ]
published: true
shortinfo: "Learn how to build specialized AI agents that transform CLI tools into conversational interfaces using Claude Agent SDK and dotnet format as a practical example."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

Transform `dotnet format` from a CLI tool into a conversational AI agent that helps you explore and manage technical debt interactively. Learn the pattern by building with **Claude Agent SDK**. This blog post demonstrates how to use `claude-agent-sdk` to wrap `dotnet format` commands, expose them via MCP, and create a conversational interface for code quality analysis.

> **Note:** You could use a general-purpose AI agent to analyze `dotnet format` output by copying and pasting JSON reports. However, a specialized agent offers significant advantages: it automates tool execution, maintains context across multiple queries, provides domain-specific insights, and creates a streamlined workflow. This post shows you how to build one. Also, it is kind of fun! 🎉

- [TL;DR](#tldr)
- [Why Build Specialized Agents?](#why-build-specialized-agents)
- [Architecture Overview](#architecture-overview)
- [Building with Claude Agent SDK](#building-with-claude-agent-sdk)
  - [Tool Layer: Wrapping `dotnet format`](#tool-layer-wrapping-dotnet-format)
  - [Agent Layer: MCP Integration](#agent-layer-mcp-integration)
  - [Making It Conversational](#making-it-conversational)
- [Demo: Interactive Code Quality](#demo-interactive-code-quality)
- [The Pattern: Reusable Building Blocks](#the-pattern-reusable-building-blocks)
- [Conclusion](#conclusion)
- [References](#references)

**Source code:** <https://github.com/NikiforovAll/dotnet-format-agent>

<script src="https://asciinema.org/a/756557.js" id="asciicast-756557" async="true"></script>

## Why Build Specialized Agents?

.NET projects often accumulate hundreds of diagnostics - formatting issues, analyzer warnings, code style violations. These can come from your IDE, `dotnet format`, or code analysis tools. **The real challenge isn't finding issues - it's dealing with the overwhelming volume:**

```bash
# Run format check
$ dotnet format --verify-no-changes --severity warn

# Result: 247 diagnostics across 45 files
# IDE0055, CA1031, IDE1006, CA2007, IDE0290...
# Which ones matter? Where do I start? What's safe to auto-fix?
```

You're faced with questions:

- 🤔 Which issues should I tackle first?
- 🤔 What's safe to auto-fix vs. needs manual review?
- 🤔 Which diagnostics indicate real problems vs. style preferences?
- 🤔 How do I prioritize across multiple files and rule types?

Manual triage is exhausting: you need to look up diagnostic IDs, assess their impact, decide on priorities, and then repeat this process for every single issue. But here's the reality - you probably don't have time for this. You've got features to ship, bugs to fix, and meetings to attend. Code quality is important, but it's rarely urgent.

So what happens? You see 247 warnings and think: *"I'll deal with this later."* Except later never comes. Or worse - you start ignoring warnings entirely. When everything is highlighted as a problem, nothing feels like a problem. The warnings lose their meaning, and suddenly you've defeated the whole purpose of having code quality tools in the first place.

Codebase maintainability matters, but it needs to fit into your actual workflow. You need a way to quickly understand what's important, what can wait, and what's safe to fix right now - without spending hours analyzing diagnostics.

**What if you could just have a conversation?** Instead of parsing diagnostics yourself, ask: *"What are the most important issues to fix first?"* or *"What can I safely auto-fix without breaking anything?"*

That's what specialized agents enable - they transform CLI tools into conversational interfaces that help you **explore, triage, and prioritize** diagnostic output in minutes.

## Architecture Overview

A specialized agent has three layers:

<div class="mermaid" style="margin-left:20%; margin-right:20%">
graph TD
    A[Conversational Interface] -->|Natural language| B[Agent + Harness]
    B -->|Tool calls| C[Tool Layer]
    C -->|dotnet format| D[.NET Project]
    
    B -.->|Uses| E[Claude Agent SDK]
    C -.->|Wraps| F[CLI Tools]
    
    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#f0e1ff
</div>

**Layer 1: Conversational Interface**  
What users interact with - plain English queries like "Show me formatting issues"

**Layer 2: Agent Harness (Claude Agent SDK)**  
Understands intent, calls appropriate tools, formats responses intelligently

**Layer 3: Tool Layer**  
Wraps `dotnet format` commands, parses output, returns structured data

**The key insight:** Keep your tool layer independent. The agent is just a conversational wrapper around existing functionality.

## Building with Claude Agent SDK

Let's build the agent piece by piece using the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-python).

### Tool Layer: Wrapping `dotnet format`

Start with a clean abstraction over `dotnet format`:

```python
class DotnetFormatRunner:
    """Wraps dotnet format CLI with structured input/output."""
    
    def run_style_check(self, project_path: str,severity: str | None = None) -> dict:
        """Run dotnet format style check."""

        # Build command
        cmd = ["dotnet", "format", "--verify-no-changes", "--report", "report.json"]
        if severity:
            cmd.extend(["--severity", severity])
        # Execute
        result = subprocess.run(cmd, capture_output=True, cwd=project_path)
        # Parse JSON report
        with open("report.json") as f:
            diagnostics = json.load(f)

        # Return structured data
        return {
            "diagnostics": diagnostics,
            "summary": self._generate_summary(diagnostics)
        }
```

**Key principles:**

- ✅ Accept structured inputs (paths, options)
- ✅ Return structured outputs (dicts with diagnostics)
- ✅ Handle errors gracefully
- ✅ Keep it testable without AI

### Agent Layer: MCP Integration

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is how Claude discovers and calls your tools. Using the Claude Agent SDK, expose your runner as MCP tools:

```python
from claude_agent_sdk import tool

@tool(
    "extract_style_diagnostics",
    "Extract code style/formatting diagnostics from dotnet format",
    {"severity": str, "exclude": list[str]}
)
async def extract_style_diagnostics(args: dict) -> dict:
    # Normalize inputs (AI might send unexpected formats)
    severity = args.get("severity")
    if severity in ["all", "None", "", None]:
        severity = None
    
    # Call your existing tool
    runner = DotnetFormatRunner()
    result = runner.run_style_check(project_path=os.getcwd(),severity=severity)
    
    # Format response using TOON (Terminal Object Notation)
    # This reduces token usage by 30-60% compared to JSON
    formatted = format_diagnostics_toon(result["diagnostics"])
    
    return {
        "content": [{
            "type": "text",
            "text": formatted
        }]
    }
```

**Why [TOON](https://github.com/toon-format/toon) format?** Instead of verbose JSON:

```json
[
  {"file": "Program.cs", "line": 10, "rule": "IDE0055", "message": "Fix formatting"},
  {"file": "Program.cs", "line": 15, "rule": "IDE0055", "message": "Fix formatting"}
]
```

Use compact format:

```text
IDE0055 (count: 2):
  Program.cs:10
  Program.cs:15
```

This is easier to read and uses fewer tokens = lower costs.

**Bundle tools into an MCP server:**

```python
from claude_agent_sdk import create_sdk_mcp_server

# Create MCP server with all your tools
dotnet_format_server = create_sdk_mcp_server(
    name="dotnet-format",
    version="1.0.0",
    tools=[
        extract_style_diagnostics,
        extract_analyzers_diagnostics,
        # ... more tools
    ]
)
```

### Making It Conversational

Configure the agent with your MCP server and system prompt:

```python
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

options = ClaudeAgentOptions(
    # Connect MCP servers
    mcp_servers={"dotnet-format": dotnet_format_server},
    # Which tools to enable
    allowed_tools=[
        "mcp__techdebt__extract_style_diagnostics",
        "mcp__techdebt__extract_analyzers_diagnostics",
        "Read",
        "Write",
        "Edit",
        "Glob",
        "Grep",
        "WebFetch"
    ],
    # Working directory
    cwd=os.getcwd(),
    # Auto-approve tool calls
    permission_mode="bypassPermissions",
    # System prompt
    system_prompt={
        "type": "preset",
        "preset": "claude_code",  # Base Claude Code behavior
        "append": """
You are a .NET code quality expert specializing in technical debt analysis.

When analyzing codebases:
1. Use 'warn' severity by default
2. Group similar issues together
3. Prioritize by impact and fix difficulty
4. Always include "Next Steps" section
"""
    }
)

# Run the agent
async with ClaudeSDKClient(options=options) as client:
    await client.query("What are the most important code quality issues?")
    
    async for message in client.receive_response():
        # Display response (markdown formatted)
        print(message.text)
```

**The system prompt is crucial** - it teaches the agent:

- ✅ Domain expertise (.NET, diagnostics)
- ✅ Tool usage patterns (default to 'warn' severity)
- ✅ Response formatting (Markdown, sections)
- ✅ Output structure (always include Next Steps)

## Demo: Interactive Code Quality

```bash
$ uv run --package tda tda "List  grouped analyzers diagnostics" --cwd ../path/to/project --interactive
Technical Debt Agent
Working directory: ~/dev/path/to/project
Model: claude-sonnet-4-5
Type 'exit' or 'quit' to end the session.

You> List analyzers diagnostics grouped by diagnostic

*Agent Response Truncated*

Would you like me to drill down into any specific diagnostic code or analyze particular files where these issues occur?

Cost: $0.0886
```
<center>
    <a href="https://asciinema.org/a/756557">
        <img src="https://asciinema.org/a/756557.svg" width="50%" style="margin: 15px;"/>
    </a>
</center>

## The Pattern: Reusable Building Blocks

Every specialized agent follows this recipe:

**1. Tool Layer** (what you already have)

```python
class YourToolRunner:
    def run_analysis(self, path: str, options: dict) -> dict:
        # Call external tool
        # Parse output  
        # Return structured data
```

**2. Agent Layer** (MCP wrapper)

```python
@tool("your_tool", "description", {schema})
async def your_tool(args: dict) -> dict:
    result = runner.run(...)
    return {"content": [{"type": "text", "text": formatted_result}]}

server = create_sdk_mcp_server(tools=[your_tool])
```

**3. Conversational Interface** (configure agent)

```python
options = ClaudeAgentOptions(
    mcp_servers={"your": server},
    system_prompt={"append": "You are a {DOMAIN} expert..."}
)

async with ClaudeSDKClient(options=options) as client:
    await client.query("Natural language question")
```

## Conclusion

Building specialized agents transforms how we interact with CLI tools:

**Before:**

```bash
dotnet format --verify-no-changes --report report.json
cat report.json | jq '...'
# manually analyze, look up docs, decide...
```

**After:**

```bash
tda "What should I fix first?"
# Get prioritized recommendations with explanations
```

**Key takeaways:**

- ✅ **Keep tool layer independent** - agent is just a wrapper
- ✅ **Use MCP** to expose tools to Claude
- ✅ **System prompt teaches domain expertise**
- ✅ **Optimize output format** (TOON over JSON)
- ✅ **Make it conversational** - multi-turn exploration beats one-shot commands

**The pattern is reusable.** Take your existing CLI tools, wrap them with Claude Agent SDK, and give them a conversational interface.

For more details, check out the [full source code](https://github.com/NikiforovAll/dotnet-format-agent). The code I provided here is a simplified version to illustrate the pattern.

## References

- **[dotnet-format-agent](https://github.com/NikiforovAll/dotnet-format-agent)** - Full source code
- **[Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-python)** - Python SDK
- **[Context7 - Claude SDK Docs](https://context7.com/anthropics/claude-agent-sdk-python)** - API reference
- **[dotnet format](https://learn.microsoft.com/dotnet/core/tools/dotnet-format)** - Official docs
