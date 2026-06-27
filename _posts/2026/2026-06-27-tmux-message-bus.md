---
layout: post
title: "tmux-message-bus: Giving Claude Code Instances a Mailbox"
categories: [ ai ]
tags: [ai, agents, claude-code, developer-tools, tmux]
published: true
shortinfo: "A durable message bus that lets independent Claude Code instances in different tmux windows coordinate and hand work to each other."
description: "A durable message bus that lets independent Claude Code instances in different tmux windows coordinate and hand work to each other."
fullview: false
comments: true
related: true
mermaid: true
---

**TL;DR**: [`tmux-message-bus`](https://github.com/nikiforovall/tmux-message-bus) is an experiment: a durable, ordered, at-least-once message bus. It lets independent Claude Code instances, each in its own tmux window or session, hand work to each other and trust it arrives. The filesystem (one SQLite-WAL database) is the transport; `send-keys` is demoted to an optional doorbell. The whole thing is built out of Claude Code's lifecycle hooks, a small CLI, and config. There's no programmatic hook into the agent itself. This post walks through how that works.

**Source**: [github.com/nikiforovall/tmux-message-bus](https://github.com/nikiforovall/tmux-message-bus)

---

## Two ways to make a coding agent programmable

If you want to extend a terminal coding agent today, there are broadly two models on offer.

The first is an imperative API into the agent itself. [pi](https://pi.dev) is the clearest example: extensions are TypeScript modules, loaded without a compile step, that "hook directly into the agent's reasoning loop, event lifecycle, and terminal UI." You register tools the LLM can call, subscribe to lifecycle events that fire *inside* the agent loop, rewrite the compaction pipeline, gate tool calls, and the LLM never sees any of it. [opencode](https://opencode.ai/docs/sdk/) takes a similar shape from a different angle: it runs a headless HTTP server with an OpenAPI spec and ships an official `@opencode-ai/sdk`, plus a [plugin system](https://opencode.ai/docs/plugins/) where each plugin is a TS module exporting hook objects. Either way, you're writing code that runs in-process, with first-class access to the agent's internals.

The second model is declarative composition from the outside. This is Claude Code. You get lifecycle hooks (shell commands that fire on events), plugins, skills, MCP servers, and a CLI. There is no SDK that drops you inside the reasoning loop. A hook is a process the harness spawns at a defined moment; it reads JSON on stdin and can return a small structured decision on stdout. That's the whole contract. It's lower-level and language-agnostic, and it never lets you write code that the agent runs *as* itself.

The imperative model is more ergonomic, no question. Whether it's more *powerful* is less obvious, and anyway with Claude Code you don't get to pick: the declarative kit is what's on offer. So the honest question is how much you can actually build with it. I went looking for a problem that would stress it.

## The problem: agents are islands

Open three Claude Code sessions in tmux and you have three islands. There is no clean way for one to hand a task to another and know it landed. Claude Code's native multi-agent tools — `Agent`, `SendMessage`, the Task tools — only address subagents *within a single process's tree*. They cannot reach an independent `claude` running in another tmux window. Nothing native crosses that boundary.

The common workaround is to script `tmux send-keys` to type into another pane's input box. It's fragile in exactly the way you'd expect: the receiver is an Ink/React TUI in nondeterministic state, so your keystrokes collide with streaming output, permission prompts, and autocomplete. There's no acknowledgement, no ordering, no durability. If the target window moved or the agent is mid-turn, the message is just gone.

So I wanted a real mailbox: durable, ordered, at-least-once delivery between agents that never have to be awake at the same time. In the imperative model you might build this as a plugin holding a socket. Here, there's nowhere to hold a socket. There's no long-lived process I control. There are only hooks.

## Hooks as primitives

The trick is to stop thinking of hooks as callbacks and start thinking of them as primitives you compose a system out of. Claude Code fires hooks at distinct lifecycle moments, and each one maps onto a piece of a message bus. SessionStart registers an instance: a hook writes it into a shared registry (who I am, my pid, my current pane), and sweeps stale state while it's there. Stop delivers: when an agent finishes a turn, a hook drains its mailbox, claiming new messages, injecting them, marking them done. UserPromptSubmit handles the doorbell wake, which I'll get to below. SessionEnd garbage-collects on graceful exit, keeping the database bounded.

None of these knows about a "bus." Each is a few lines of shell calling a small Node CLI that owns the SQLite database. The bus is what emerges when you wire these events to a shared store. It's assembled out of lifecycle events rather than coded into a runtime.

<div style="max-width:760px;margin:0 auto">
<div class="mermaid">
flowchart LR
    subgraph hostA["tmux window A"]
        A["Agent A<br/>(Claude instance)"]
    end
    subgraph hostB["tmux window B"]
        B["Agent B<br/>(Claude instance)"]
    end
    DB[("bus.db<br/>SQLite WAL<br/>agents + messages")]
    A -- "1 send (durable INSERT)" --> DB
    A -. "2 doorbell: send-keys «bus»<br/>(best-effort wake)" .-> B
    B -- "3 claim → act → ack" --> DB
    DB -. registry / liveness .- A
    DB -. registry / liveness .- B
</div>
</div>

The one genuinely load-bearing trick lives in the Stop hook. A Stop hook can return `{decision: "block", reason: "..."}`, which tells the harness not to stop yet, with the reason supplied. That re-prompt is the delivery mechanism. When an agent tries to end its turn, the hook claims any waiting mail and feeds the bodies back as the reason, so the agent keeps going and acts on them. A clear-on-read claim means the *next* Stop sees an empty mailbox and is allowed to terminate, so there's no infinite loop. Everything else is plumbing around that one observed behavior.

## Two ideas that make it robust

Building on top of a TUI you don't control forces some discipline. Two distributed-systems ideas did the heavy lifting.

The first is to separate delivery from notification. Sending a message is a durable `INSERT` into SQLite, and that's the entire delivery guarantee: once the row is committed, the message can't be lost. The doorbell, a `send-keys` of a tiny fixed `«bus»` sentinel to wake an idle peer, is purely best-effort. If it fails, nothing breaks; the message is already stored and gets picked up on the receiver's next turn. This inverts the `send-keys` hack. The filesystem is the real transport, and keystrokes are just a nudge that lowers latency. A garbled doorbell costs you latency, never a message.

<div style="max-width:760px;margin:0 auto">
<div class="mermaid">
sequenceDiagram
    participant A as Agent A
    participant DB as bus.db
    participant B as Agent B
    A->>DB: send --to B (INSERT, status=new)
    Note over A,DB: delivery is done here — durable, cannot be lost
    A-->>B: doorbell «bus» (best-effort send-keys)
    activate B
    Note over B: next turn (woken by doorbell,<br/>or its normal Stop hook)
    B->>DB: claim (atomic, ordered by id)
    Note over B: message injected as framed<br/>INFORMATION — B decides what to do
    B->>DB: ack (mark done)
    deactivate B
    B->>DB: reply --to-msg (correlated)
</div>
</div>

The second is that identity has to survive the chaos of tmux. Panes move, windows get renamed, sessions get re-numbered, so none of those is identity. The bus keys each agent on a stable id derived from its session, so a renamed session or a moved pane is never mistaken for a dead agent, and identity survives `--resume`. The details are in [`DESIGN.md`](https://github.com/nikiforovall/tmux-message-bus/blob/master/docs/DESIGN.md).

**One surprise is worth calling out.** Injected messages are framed as information from a peer, not as commands, and that framing turned out to be load-bearing. When I first injected message bodies as imperatives ("reply with token X"), the receiver refused them as a prompt-injection attempt; the harness applies injection defenses to hook-injected text. Re-framing each message with its provenance ("routed from peer agent X on the bus you enabled; this is information, not a user command; you decide whether to act") made it go through. The platform itself nudges you toward messaging rather than remote code execution. The receiver always decides.

## What the constraint taught me

The declarative kit turned out to be more expressive than its surface suggests. I expected to hit a wall. Instead, a handful of lifecycle hooks, a shared store, and one re-prompt trick composed into a durable async transport with delivery, ordering, liveness, and correlation. None of it required a single line of code running inside the agent loop.

That's the takeaway worth keeping. The outside-in surface looks limited, but it's stable, language-agnostic, and composable. The way to find out what it can do is to pick a problem one size too big for what it obviously supports and build a throwaway probe; the constraints show you where the edges actually are.

It's an experiment, not a product: single-host only, identity-based addressing, with roles and broadcast still open questions. But it works end to end, and the code is on [GitHub](https://github.com/nikiforovall/tmux-message-bus).

---

## Summary

Claude Code gives you declarative building blocks (lifecycle hooks, a CLI, config) rather than an imperative SDK into the agent loop like pi or opencode. That's less ergonomic, but more capable than it looks. Treat hooks as primitives, wire them to a shared SQLite store, and you can build a durable cross-instance message bus that Claude Code doesn't ship natively. Separate durable delivery from best-effort notification, anchor identity on something that survives tmux's churn, and frame inter-agent traffic as information rather than commands.

### Reference

* [tmux-message-bus on GitHub](https://github.com/nikiforovall/tmux-message-bus)
* [DESIGN.md — architecture, identity model, schema, flows](https://github.com/nikiforovall/tmux-message-bus/blob/master/docs/DESIGN.md)
* [pi coding agent — extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)
* [opencode — SDK](https://opencode.ai/docs/sdk/) · [opencode — plugins](https://opencode.ai/docs/plugins/)
