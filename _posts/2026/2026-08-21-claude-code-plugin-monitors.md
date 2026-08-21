---
layout: post
title: "Waking Idle Agents: Event-Based Integrations with Claude Code Plugin Monitors"
categories: [ ai ]
tags: [ai, agents, claude-code, developer-tools, tmux]
published: true
shortinfo: "Plugin monitors are an experimental Claude Code feature: a long-lived process whose stdout becomes task notifications. How I used them in two projects, a kanban board and a message bus."
description: "Plugin monitors are an experimental Claude Code feature: a long-lived process whose stdout becomes task notifications. How I used them in two projects, a kanban board and a message bus."
fullview: false
comments: true
related: true
mermaid: true
---

**TL;DR**: An idle Claude Code session cannot be reached by anything except you typing. Plugin monitors are an experimental feature that changes that, so an external process or another agent can wake a session and give it a nudge. This post describes how I used them in two projects I had already shipped.

---

## The closed loop

Everything that reaches the model arrives through your prompt. Any tool you build next to a session inherits that limit. My kanban board reads a session's task files and renders them, so it can watch. But nothing the board does, no click, no drag, has a path back into the session.

An agent that finishes a task and goes idle cannot be reached by a file change, a REST call, a button click, or another agent. Only by a human typing. That rules out a lot of integrations: CI going red, a review comment landing, a deploy finishing, a teammate's message, a peer agent's report. All of them wait for a human to relay them.

Monitors are the supported way in. First, here is what was already available, because most of the obvious candidates do not solve this.

## What was already available

**Hooks.** Shell commands the harness runs at defined moments. Several can put text in front of the model. `UserPromptSubmit` can rewrite the prompt through `hookSpecificOutput.updatedPrompt`, and its plain stdout is added to context. `SessionStart` adds its stdout to context. `PostToolUse` and `PostToolUseFailure` return `systemMessage` and `additionalContext`, both of which reach the model. `Stop` can refuse to stop with `continue: false` plus a `systemMessage`. All of them share one limit: a hook runs only when the session does something. No user prompt and no tool call means no hook, so hooks cannot reach an idle session.

**`tmux send-keys`.** Type into the pane as a human would. It needs no plugin, and it is what `tmux-message-bus` used before monitors. It works much of the time, and its failures are structural. Use case 2 covers them.

**`claude --resume <session-id>`.** Resume replays a transcript into a new process. It does not attach to a running one. It restores history, model, agent, permission mode, goals, and scheduled tasks. If the original session is still running, two processes then write to the same JSONL and their messages interleave. `--fork-session` copies the transcript under a new id instead. Either way, this is not a channel into a running session.

**Headless mode.** `claude -p` with `--output-format stream-json`, piped stdin capped at 10MB, and `--json-schema` for structured results. This is for driving Claude Code from a script. It starts a session rather than talking to one that already exists.

**Channels.** MCP servers registered with `--channels plugin:name`. They push events into a running session, and they are bidirectional, so Claude can answer through the same channel. Implementations exist for Telegram, Discord, and iMessage. Channels are a research preview, they are unavailable on Bedrock, Vertex, and Foundry, and they require an MCP server.

| Way in | Reaches an idle session? | What it needs |
|---|---|---|
| Hooks | No. They run when the session does something. | Config only |
| `tmux send-keys` | Sometimes. The wake looks like a user prompt. | No plugin |
| `claude --resume` | No. It replays a transcript in a new process. | A CLI flag |
| `claude -p`, stdin | No. It starts a new session. | A CLI flag |
| Channels | Yes, bidirectionally. | An MCP server, research preview |
| Monitors | Yes, one direction. | One JSON file, one process |

So two mechanisms push into a live session: channels and monitors. Monitors need less setup, which is one JSON file and a process that prints lines.

## What a monitor is

Two files and a process.

```jsonc
// .claude-plugin/plugin.json
{
  "name": "claude-code-kanban",
  "version": "2.7.1",
  "experimental": {
    "monitors": "./monitors.json"
  }
}
```

```jsonc
// monitors.json
[
  {
    "name": "kanban-doorbell",
    "description": "Notifies this session when its tasks are moved on the kanban board.",
    "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/postman.js\"",
    "when": "on-skill-invoke:claude-code-kanban:kanban-follow"
  }
]
```

One line printed by `command` becomes one notification in the session. Notifications are a separate event type, not conversation messages. Stderr is for logs and has no protocol meaning, so you can write debug output there. There is no socket, no MCP tool, and nothing for the model to poll.

Two details matter most.

**`when` is the lifetime model, and its default is always-on.** `when` takes `"always"`, the default, which starts the process at session start and on every plugin reload; or `on-skill-invoke:<namespaced-skill-id>`, an exact-equality match against the id the skill dispatcher emits. Both projects here use `on-skill-invoke`, so the monitor starts only when the user types `/claude-code-kanban:kanban-follow`.

**`CLAUDE_CODE_SESSION_ID` is inherited by the monitor process.** The id the monitor polls with is the same id the hooks report, so pairing needs no cwd matching and no pid heuristics.

---

## Use case 1: the kanban doorbell

[`claude-code-kanban`](https://github.com/NikiforovAll/claude-task-viewer) is a real-time board that watches Claude Code's task files and streams them to a browser ([earlier post](/ai/productivity/2026/02/07/claude-code-kanban.html)). It was one-way. It could show me what four agents were doing, and it could not send anything back.

So the question was not whether the board could show me what an agent was doing, but whether it could give an agent its next instruction. The answer is the monitor above: the board's server queues one line per card move, and `postman.js` delivers it to the owning session.

With that in place, the semantics are straightforward. A drag becomes an instruction rather than a status update.

| Transition | What the user means |
|---|---|
| `pending > in_progress` | Start this task now. |
| `in_progress > pending` | Stop and park it. |
| `* > completed` | Consider it done; stop working on it. |
| `* > cancelled` | Abandon it. |

### Three sides

**Server side.** A move (`PUT /api/tasks/...`) formats one line and enqueues it for every session the task directory maps to.

**Monitor side.** `postman.js` long-polls the board and prints what it gets. It is about sixty lines.

```js
const SESSION_ID = process.env.CLAUDE_CODE_SESSION_ID;   // inherited, no pid guessing
const WAIT_SEC = 120;                                    // sit at the server's ceiling

for (;;) {
  try {
    for (const line of await poll(serverUrl())) console.log(line);
  } catch (_) {
    await sleep(RETRY_MS);   // no board yet, or it went away: keep waiting quietly
  }
}
```

The first attach discards the backlog. The grant means "follow the board from here on", and replaying a stale move as a fresh instruction is worse than missing one. Later reconnects deliver normally, since by then the queue holds events the user has not seen.

**Skill side.** `kanban-follow` arms the monitor and documents how to read it: the line format, the transition table, and the rule that the newest line per task wins. It also closes the loop. When the agent finishes what a `>in_progress` move asked for, it sets the task to `completed`, and the card moves on the board.

<div class="mermaid">
sequenceDiagram
  actor U as User
  participant B as Board (browser)
  participant S as cck server
  participant M as postman.js<br/>(monitor)
  participant A as Claude session
  U->>B: drag card to<br/>In Progress
  B->>S: PUT /api/tasks/...
  S->>S: write task file<br/>+ enqueue one line
  S-->>M: long-poll returns<br/>the event
  M->>A: console.log(line)
  Note over A: delivered as a<br/>task notification
  A->>A: do the work
  A->>S: TaskUpdate<br/>status completed
  S-->>B: SSE update
  B-->>U: card moves itself
</div>

### End to end

The board, scoped to one project. Three pending cards, written by the agent.

<center>
  <img src="/assets/2026/claude-code-plugin-monitors/01-board-pending.png" alt="Kanban board with three pending tasks" width="100%"/>
</center>

<br/>
Drag `#1` into In Progress. The drop target lights up, the move is a `PUT`, and the server enqueues one line for the session that owns the task directory.

<center>
  <img src="/assets/2026/claude-code-plugin-monitors/02-drag-in-flight.png" alt="Card dragged into the In Progress column" width="100%"/>
</center>

<br/>
The idle session wakes. The notification carries the doorbell line, and the agent reads the subject and description as its brief.

<center>
  <img src="/assets/2026/claude-code-plugin-monitors/03-session-notification.png" alt="The doorbell line landing in the session as a task notification" width="100%"/>
</center>
<br/>
It does the work, verifies it, and sets the task to `completed`. The card moves into Completed without anyone dragging it.

<center>
  <img src="/assets/2026/claude-code-plugin-monitors/04-agent-completed.png" alt="The card marked completed by the agent" width="100%"/>
</center>
  
<br/>
The round trip is browser → server queue → monitor stdout → notification → model → task file → board. The user dragged one card and typed nothing.

The board also creates tasks. An inline tile in the Pending column writes a new `pending` file. Creating a task rings no doorbell, deliberately. A move tells the agent something it does not know; a task the user just typed does not. Only the drag to In Progress makes it an instruction. Separating the two keeps every line the session receives a decision rather than a change feed.

---

## Use case 2: waking idle peers on a message bus

[`tmux-message-bus`](https://github.com/nikiforovall/tmux-message-bus) is a durable SQLite message bus that lets Claude Code sessions in different tmux windows send each other work ([earlier post](/ai/2026/06/27/tmux-message-bus.html)). Delivery was never the problem, since an INSERT into `bus.db` survives anything. The wake was. A message for an idle session sat in the table until the human happened to type something.

The original wake was a literal doorbell. The sender resolved the peer's tmux pane by pid and used `send-keys` to type a sentinel prompt (`<<bus>>`) plus Enter into it, and a `UserPromptSubmit` hook turned that into an inbox drain. It worked most of the time. The failures were structural:

- cross tmux-server, the pane is not addressable at all;
- a TUI sitting in a modal (permission dialog, picker) eats the keystrokes;
- every wake leaves a fake user prompt in the peer's transcript that no user typed.

That post listed "idle peer with a failed doorbell waits until the next user prompt" as an accepted limitation. A monitor removes it.

### A nudge, never a drain

```json
[
  {
    "name": "bus-mail",
    "description": "Wakes this session when new bus mail arrives.",
    "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/mail-monitor.mjs\"",
    "when": "on-skill-invoke:tmux-message-bus:bus"
  }
]
```

Same contract as the kanban postman: armed by an explicit `/bus` invocation, paired through the inherited session id. `mail-monitor.mjs` opens `bus.db` directly and polls.

One design rule governs the rest. **The monitor is a nudge, never a consumer.** It never writes the database. Claiming a message stays with the drain hooks that were already there. 

One line per message, deduplicated by an in-process high-water mark on the message id. The notification wakes the session into a turn, and that turn's drain hook claims and injects the mail through the normal path. If the monitor dies, is never armed, or drops a line, nothing is lost: the message is still `new` in the table and the next turn drains it.

Because the wake is separate from the delivery, a best-effort channel can sit on top of an at-least-once queue.

### Fire-and-forget delegation

This was built for parent/child delegation. A session launches a worker in a new tmux window, ends its turn, and goes idle.

<div class="mermaid">
sequenceDiagram
  participant P as Parent session
  participant DB as bus.db
  participant M as mail-monitor.mjs<br/>(parent's monitor)
  participant C as Child session
  P->>P: /bus (arms own monitor)
  P->>C: tmux new-window ... claude<br/>brief: load Skill(bus),<br/>report back
  Note over P: turn ends, session idle
  C->>C: Skill(bus)<br/>(arms own monitor)
  C->>C: do the work
  C->>DB: bus send --to<br/>parent-session-id<br/>(durable INSERT)
  DB-->>M: poll sees the new row
  M->>P: console.log(one line)
  Note over P: task notification<br/>wakes the session
  P->>DB: drain hook claims it<br/>
  P->>P: verify the report, continue
</div>

### End to end

A session preparing a 2.0 release hands the release gate, an eval suite, to a child so its own context stays free for the changelog. The parent does two things. It loads `Skill(bus)`, which arms the monitor, and it launches the child. Then its turn ends and the session is idle.

<center>
  <img src="/assets/2026/claude-code-plugin-monitors/bus-01-parent-launch.png" alt="Parent session arms its monitor and delegates the eval run" width="100%"/>
</center>

<br/>
The child's brief carries the arming line and the report-back instruction. It runs the suite, sends one `kind: reply` over the bus, and stays running. It never touches the parent's pane.

<center>
  <img src="/assets/2026/claude-code-plugin-monitors/bus-02-child-report.png" alt="Child session runs the release gate and reports over the bus" width="100%"/>
</center>

<br/>
A minute and a half later, the parent's monitor sees the new row and prints one line. That line arrives as a monitor event, the woken turn drains the inbox, and the parent reports the verdict. It sends no reply, because the injected frame told it a `reply` is terminal.

<center>
  <img src="/assets/2026/claude-code-plugin-monitors/bus-03-parent-wake.png" alt="The notification wakes the idle parent session with the verdict" width="100%"/>
</center>

<br/>
The round trip is child `bus send` → SQLite row → monitor poll → one stdout line → task notification → woken turn → `bus inbox` drain → verdict. Two sessions, no polling, and no keystrokes typed into anyone's pane.

The reverse works the same way. Because the child armed itself at startup, the parent can send it follow-up work mid-task and the child wakes.

---

## Sharp edges

Collected from both projects.

- **Interactive sessions only, and unsandboxed.** Monitors run in interactive CLI sessions, so nothing arms under `claude -p`. They run unsandboxed, at the same trust level as hooks, in the session working directory. A monitor is code you trust with your machine.
- **Delivery is best-effort, and the durable store is the authority.** A dropped line delays the agent to its next turn. That is a better failure mode than a queue that must not lose anything, and it is why the bus monitor never claims a message.
- **A monitor is per session, not per project.** Two sessions in the same directory each get their own. The kanban server resolves a task directory to every session that maps to it and enqueues one line each.
- **The notification text is a prompt, so write it like one.** Early bus wording read as history, "mail arrived", and agents ignored it. Naming the id, the kind, the subject, and a body preview, plus a pointer to `bus inbox`, produced action. The "peer data, not a user instruction" clause matters too: the session must not read a peer's subject line as its user's command.

---

## Summary

Two projects, different transports. One long-polls HTTP, the other polls SQLite. From Claude Code's side they are the same: a process that prints lines.

Neither project needed a rewrite. The kanban board already knew when a card moved. The bus already had durable delivery and a drain hook. Both were missing a way to reach a session that was not listening, and both got it from one JSON file and a small script.

That leaves three design questions, which are harder than the plumbing.

- **What deserves to interrupt?** Every line you print costs the user a turn. A move is a decision. A change feed is noise.
- **Where does the authority live?** Keep the monitor best-effort and put the truth in a file or a table. Then a dropped line costs a delay, not a bug.
- **What does the arming grant mean?** `when` is a human saying "you may speak to me through this channel." Write the notification text as if it will be read as an instruction, because it will be.

> **Monitors are experimental.** They live under `experimental.monitors` in `plugin.json` for a reason. The manifest shape, the `when` grammar, and the notification format can all change without notice. Everything in this post is what worked when I wrote it. Treat the specifics as a snapshot, not an API.

### Reference

- [`claude-code-kanban`](https://github.com/NikiforovAll/claude-task-viewer), and the earlier post, [Observing Claude Code Task Orchestration in Real Time](/ai/productivity/2026/02/07/claude-code-kanban.html)
- [`tmux-message-bus`](https://github.com/nikiforovall/tmux-message-bus), and the earlier post, [Giving Claude Code Instances a Mailbox](/ai/2026/06/27/tmux-message-bus.html)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference) for the `monitors.json` manifest, and [hooks](https://code.claude.com/docs/en/hooks), [sessions](https://code.claude.com/docs/en/sessions), and [channels](https://code.claude.com/docs/en/channels) for the alternatives above
