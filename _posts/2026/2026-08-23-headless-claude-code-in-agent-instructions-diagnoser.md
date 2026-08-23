---
layout: post
title: "Headless Claude Code as a Building Block: Auditing Agent Instructions"
categories: [ ai ]
tags: [ai, agents, claude-code, developer-tools, automation]
published: true
shortinfo: "Headless Claude with --json-schema, --agents, and --allowedTools becomes a callable AI subroutine. I used it to build Memory Diagnoser, a tool that audits the instruction files feeding my own agents."
description: "How to use headless Claude Code as a building block inside your own tooling: structured output, inline subagents, scoped permissions — and the memory auditor I built on top of it."
fullview: false
comments: true
related: false
mermaid: true
image: /assets/2026-08-23-headless-claude-code-building-block/overview.png
---

**TL;DR**: Headless Claude gives you a reasoning subroutine you can call from any process. Three flags turn it from "script a prompt" into a dependable building block: `--json-schema` to pin the result shape, `--agents` to define a fan-out inline, and `--allowedTools` to scope what it may touch. I used that to build Memory Diagnoser, which audits the CLAUDE.md files, skills, and auto-memory that shape my own sessions.

**Docs**: [nikiforovall.blog/claude-code-memory](https://nikiforovall.blog/claude-code-memory/)

<center>
  <img src="/assets/2026-08-23-headless-claude-code-building-block/overview.png" width="90%" alt="Memory Diagnoser overview" />
</center>

---

## The problem I actually had

155 auto-memory files across 43 projects, 24 project `CLAUDE.md` files, a 121-line global one. Most of it accumulated on its own, a memory at a time, and every file is a small standing instruction to every future session. That is more than anyone can hold in their head, and it rots.

I already [built a viewer](https://nikiforovall.blog/claude-code-memory/) for this stack. A viewer cannot tell me the stack is *wrong*, and it goes wrong in ways no linter catches:

- Two memories that quietly say opposite things.
- A rule guarding a tool I uninstalled months ago.
- A skill pointing at a script that moved.
- A memory recording for an issue that was already fixed, so it is now a lie.

Every file is valid Markdown. Nothing fails. The agent just gets slightly worse advice every week, and you have no idea which week it started.

## Three ways to add reasoning to a tool

| Approach | What it costs | Why I passed / picked it |
|---|---|---|
| Anthropic API directly | Own the tool loop, retries, file access, prompt caching | Reimplements what Claude Code already does well |
| Agent SDK | Cleaner than raw API, still a dependency + auth story | Reasonable; heavier than I needed for one feature |
| Headless Claude | Requires Claude Code installed | Picked it. Zero auth code, inherits the whole harness |

The deciding argument: the audit needs to *verify* claims by reading the repo and probing the machine. That is a tool loop with file access and permissions. Claude Code is already that, and it is already installed and authenticated on my machine. Spawning it is cheaper than rebuilding it.

## The mechanic

Three flags do the work.

```js
const args = [
  '-p',                                             // headless: read prompt, print result, exit
  '--output-format', 'json',                        // machine-readable envelope
  '--json-schema', JSON.stringify(ANALYSIS_SCHEMA),  // pin the result shape
  '--agents', JSON.stringify(ANALYSIS_AGENTS),       // define subagents inline
  '--allowedTools', ...ANALYSIS_ALLOWED_TOOLS,       // scope what they may run
];
const child = spawn('claude', args, { cwd: projectRoot, windowsHide: true });
child.stdin.end(prompt);
```

### `--json-schema` gives you a typed return value

This is the flag that turns a CLI into a function. You hand it a JSON Schema and the result arrives already conforming, in the envelope's `structured_output`:

```js
const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['duplicate', 'contradiction', 'stale', 'invalidate', 'quality', /* ... */] },
          severity: { type: 'string', enum: ['high', 'med', 'low'] },
          title: { type: 'string' },
          detail: { type: 'string' },
          suggestion: { type: 'string' },
          // ... files, scope, evidence
        },
        required: ['kind', 'severity', 'title', 'detail', 'suggestion'],
      },
    },
  },
  required: ['summary', 'findings'],
};
```

### The envelope carries more than the answer

```js
const envelope = JSON.parse(out);
if (envelope.is_error) return { ok: false, error: String(envelope.result) };
return {
  ok: true,
  data: envelope.structured_output,
  costUsd: envelope.total_cost_usd,
  durationMs: envelope.duration_ms,
};
```

`total_cost_usd` and `duration_ms` come back on every run, and surfacing them in the UI is what stops this feeling like a magic box. Each audit shows what it cost and how long it took. Without those two numbers you are shipping a feature whose bill you cannot predict.

### `--agents` defines a fan-out inline

You do not have to ship agent files to use subagents. Pass them as JSON and they exist for that invocation only:

```js
function reviewerAgent(description, rubric, common = REVIEWER_COMMON) {
  return {
    description,
    prompt: [common.join('\n'), RUBRIC_CORE, rubric, REVIEWER_REPORT].join('\n\n'),
    tools: ['Read', 'Grep', 'Glob', 'Bash'],
  };
}

const ANALYSIS_AGENTS = {
  'memory-reviewer':         reviewerAgent('...one auto-memory file...',  RUBRIC_MEMORY),
  'skill-reviewer':          reviewerAgent('...one SKILL.md...',          RUBRIC_SKILL),
  'claude-md-reviewer':      reviewerAgent('...one project CLAUDE.md...', RUBRIC_CLAUDE_MD),
  'claude-md-user-reviewer': reviewerAgent('...the global CLAUDE.md...',  RUBRIC_CLAUDE_MD_USER, REVIEWER_COMMON_USER),
};
```

The structural decision here is where the rubrics live. Each reviewer's criteria sit in that *agent's* system prompt, not in the orchestrator's. The orchestrator passes one file name and one file's content, nothing else.

### `--allowedTools` is the safety boundary

```js
const ANALYSIS_ALLOWED_TOOLS = ['Bash(command -v:*)', 'Bash(which:*)', 'Bash(where:*)'];
```

A reviewer has to answer "does this tool still exist on the machine?", and that needs Bash. But handing full Bash to an agent that is reading arbitrary instruction files, some of which I did not write, is not a trade I want to make.

This is where headless mode differs from an interactive session in a way that matters: there is no one at the keyboard to approve a prompt, so anything not on the allowlist is auto-denied rather than escalated. `Read`, `Grep`, and `Glob` need no grant at all, which covers everything else a reviewer does.

## The design: orchestrator plus reviewers

<center>
<div class="mermaid">
graph TD
    T["Memory Diagnoser<br/>(Node server)"] -->|spawn headless Claude| O["Orchestrator"]
    O -->|parallel batch| R1["memory-reviewer"]
    O --> R2["skill-reviewer"]
    O --> R3["claude-md-reviewer"]
    O --> R4["claude-md-user-reviewer"]
    R1 -->|verify vs repo| M["Findings"]
    R2 -->|verify vs repo| M
    R3 -->|verify vs repo| M
    R4 -->|verify vs machine| M
    M --> O
    O -->|structured_output| T
</div>
</center>

The orchestrator does not review anything itself. It dispatches and merges, and the prompt says so. Without that line, nothing stops a model holding twenty files and four reviewer agents from reading a few itself, and a file it reads itself is a file that never met a rubric. Keeping the parent a router keeps the criteria identical for every file.

Dispatch is type-matched. Auto-memory and agent-memory go to `memory-reviewer`, `SKILL.md` to `skill-reviewer`, project instruction files to `claude-md-reviewer`. That mapping is why there are four agents and not one general-purpose one.

The fan-out is one parallel batch of *blocking* calls. Parallel is why an audit of twenty files does not take twenty times as long as one. Blocking is a guardrail: the orchestrator holds its report until every reviewer has returned, so no reviewer can be dropped from the merge for being slow.

## What it actually found

I ran it across this repo and its three submodules. Seven findings. I checked every one by hand and all seven headline claims held up. One got a detail wrong.

The two contradictions were worth the whole run. One `CLAUDE.md` said the repo has no linter, a few lines from a Biome config and a pre-commit hook. Another said "No build/lint/test commands" in a repo with real test scripts. An agent reads that and skips a check it should have run. Nothing about the file looks wrong.

Two more were drift in copied data: region tables and line counts off by up to a factor of two, one still listing a region that had been deleted.

Those two say something about where rot lives. It collects wherever the docs restate what the code already knows. A section like that goes stale by default, so re-syncing the table just schedules the same finding for next quarter. Delete it, leave `rg '#region'` in its place, and it is fixed once.

---

## Summary

The reusable part is the contract, not the tool. A JSON Schema goes in, `structured_output` comes back, and the subagents and permissions are declared at the call site. Your process keeps what it is already good at, which is state, persistence, and the UI. Headless Claude supplies the one thing a Node server cannot, which is a judgment call over files that are all individually valid.

### Reference

* [Claude Code Hub](https://nikiforovall.blog/claude-code-hub/) — the launcher Memory Diagnoser ships in
* [Claude Code headless mode](https://code.claude.com/docs/en/headless)
* [Claude Code subagents](https://code.claude.com/docs/en/sub-agents)
* [claude-code-memory](https://github.com/NikiforovAll/claude-code-memory) — Memory Diagnoser source
