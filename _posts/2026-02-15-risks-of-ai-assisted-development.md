---
layout: post
title: "Risks of AI-Assisted Development"
categories: [ ai ]
tags: [ ai, productivity, software-engineering ]
published: true
shortinfo: AI coding tools are useful, but understanding their failure modes — from prompt injection to skill degradation — is essential for using them responsibly.
fullview: false
comments: true
related: true
---

<center>
<img src="/assets/risks-of-ai-assisted-development/cover.png" alt="cover" width="80%"/>
</center>

## TL;DR

AI coding tools are powerful but come with real risks: unsolved prompt injection vulnerabilities, subtle bugs that pass review because they "look right," cognitive shifts from writing to reading code, measurable skill degradation, and unclear ROI. None of these mean you should stop using AI — they mean you should use it with open eyes. Review AI-generated code harder, write code by hand regularly, and make sure fundamentals come before delegation.

- [TL;DR](#tldr)
- [Introduction](#introduction)
- [1️⃣ Security: prompt injection is unsolved](#1️⃣-security-prompt-injection-is-unsolved)
- [2️⃣ Subtle bugs: the "looks right" problem](#2️⃣-subtle-bugs-the-looks-right-problem)
- [3️⃣ Cognitive shift: reading vs. writing code](#3️⃣-cognitive-shift-reading-vs-writing-code)
- [4️⃣ Skill degradation: knowing when to learn](#4️⃣-skill-degradation-knowing-when-to-learn)
- [5️⃣ Cost: the enterprise pricing question](#5️⃣-cost-the-enterprise-pricing-question)
- [What to do about all this](#what-to-do-about-all-this)


## Introduction

AI coding tools are useful. They're also new enough that we're still figuring out what goes wrong when you lean on them too hard. This post covers the real risks — not to scare anyone off, but because using a power tool without understanding its failure modes is how you lose a finger.

AI is a tool. Treat it like one. A table saw doesn't care about your fingers, and a language model doesn't care about your codebase.

---

## 1️⃣ Security: prompt injection is unsolved

Every AI tool that processes external input is vulnerable to **prompt injection**. This is not a theoretical concern — it's a known, actively exploited class of vulnerability with no general solution today.

The core problem: language models can't reliably distinguish between *instructions* and *data*. If your application feeds user input into a prompt, an attacker can hijack the model's behavior. Filters and guardrails help, but they're mitigations, not fixes. Researchers keep finding bypasses.

What this means in practice:

- Code that calls AI APIs with user-supplied content needs the same scrutiny as code that builds SQL queries from user input
- AI-generated code may introduce vulnerabilities the model doesn't flag — it optimizes for "looks correct," not "is secure"
- Supply chain concerns multiply when AI suggests dependencies it was trained on but hasn't vetted

Until prompt injection has a real solution (and there's no timeline for that), treat AI-touching-external-input as a threat surface.

## 2️⃣ Subtle bugs: the "looks right" problem

AI-generated bugs are different. The code reads clean. Variable names are reasonable. The structure follows conventions. Everything looks right. And buried inside is a logic error that won't surface until production — a race condition, an off-by-one in business logic, a null check that misses an edge case.

This is genuinely dangerous. Code review relies partly on pattern recognition — reviewers notice when something "feels off." AI-generated code doesn't trigger that instinct because it's optimized for readability, not correctness. The model produces text that *looks like* working code based on statistical patterns. Sometimes that's working code. Sometimes it's convincingly wrong.

The defense is old-fashioned: **tests, assertions, thorough reviews, and healthy skepticism**. Don't trust code more because it reads well. Read it harder *because* it reads well.

## 3️⃣ Cognitive shift: reading vs. writing code

Writing code and reading code use different parts of your brain. Writing forces you to think through logic step by step — you're constructing. Reading is pattern matching — you're recognizing.

Neuroscience calls this the **"generation effect"** (documented since 1978): you need to *do* something to truly know it. Flash card experiments showed that generating a word from a partial cue created dramatically better recall than just reading the complete word. Brain scans confirm it — generating thoughts from scratch lights up multiple brain regions simultaneously. Reading or hearing information barely registers by comparison.

When AI writes the code and you review it, you're always in reading mode. You lose the constructive thinking that comes from writing. Over months and years, that changes how you relate to code. You get better at skimming and approving, worse at building from scratch.

An MIT study put numbers on this. Researchers monitored brain activity (EEG) while students wrote essays under three conditions: unassisted, AI-assisted, and AI-after-outlining. The AI-assisted group showed **significantly lower brain activity and neural connectivity** while working. And here's the telling part: **83% of the ChatGPT group couldn't recall a single sentence from their own essay** minutes after finishing. The essays were technically fine — grammatically correct, well-structured — but evaluators consistently called them "hollow" and "soulless." The students produced text without thinking. It showed.

This isn't hypothetical. Developers who rely heavily on autocomplete and generation tools report feeling less confident writing code without them. The skill atrophies like any unused muscle.

The risk isn't that AI makes you a worse developer tomorrow. It's that two years from now, you can't write a moderately complex function without reaching for a tool. And when the tool is wrong (see previous section), you can't tell.

**Deliberate practice matters.** Write code by hand regularly. Solve problems without AI assistance. Keep the muscle working.

## 4️⃣ Skill degradation: knowing when to learn

There's a difference between delegating a task you understand and delegating a task you've never learned. AI blurs this line.

If a senior developer uses AI to generate boilerplate they've written hundreds of times — fine. They know what correct looks like. They'll spot problems. But if a junior developer uses AI to skip learning how authentication works, or how database transactions behave, they're building on a foundation they don't have.

The evidence from other fields is blunt:

- **London taxi drivers** — who navigate from memory — had physically larger brain regions for spatial reasoning than average. Drivers who switched to GPS experienced measurable gray matter shrinkage in those same regions.
- **Doctors** who used AI diagnostic assistance for just four months showed weakened ability to spot cancer independently afterward.
- In a study by **Christof Van Nimwegen**, participants who solved logic puzzles with software assistance collapsed when the software was taken away — they "aimlessly clicked around" while the unassisted group kept improving.

The pattern repeats: outsource a cognitive function to a tool, and the brain physically downsizes for that function. There's no reason to think coding is exempt.

The uncomfortable truth: AI makes it easy to produce code you don't understand. And for a while, that works. You ship features, hit deadlines, look productive. The gap shows up when something breaks in an unfamiliar way, or when you need to design something the model hasn't seen, or when you're in a meeting and can't explain your own system.

Know the difference between *"I'm using AI to go faster at something I know"* and *"I'm using AI to avoid learning something I should know."* The second one has a cost, and you pay it later.

## 5️⃣ Cost: the enterprise pricing question

AI tooling isn't cheap. Enterprise tiers, additional API usage for agentic workflows, premium models — the bill adds up. For a team of 100 developers, you're looking at $25-50K/year just for Copilot licenses, potentially much more with heavy agentic usage.

The ROI question remains genuinely open. Vendors cite productivity studies, but most of those measure speed on isolated tasks, not long-term codebase quality or maintenance costs. Nobody has strong longitudinal data yet.

Meanwhile, pricing models keep changing. What costs \$19/month today might cost \$39 tomorrow if vendors decide the market will bear it. Or it might get cheaper as competition increases. Nobody knows, and that uncertainty makes long-term budgeting harder than anyone admits.

Organizations should treat AI tool spend like any other infrastructure cost: measure what you can, set budgets, and be honest about what you don't know yet. *"Everyone else is paying for it"* is not a strategy.

---

## What to do about all this

None of these risks mean you should avoid AI tools. They mean you should use them with open eyes.

- Review AI-generated code with *more* scrutiny, not less
- Maintain security practices around any AI-facing surface
- Write code by hand regularly to keep your skills sharp
- Make sure junior developers learn fundamentals before leaning on generation
- **Think first, then delegate** — outline your approach before handing work to AI (the MIT study found this group had *higher* brain connectivity than even the unassisted group)
- Track your AI tool costs and measure outcomes honestly
- Stay current on prompt injection research — the landscape changes fast

The developers who'll get the most from AI tools long-term are the ones who understand both the capabilities and the failure modes. Blind trust and blind rejection are equally wasteful.

