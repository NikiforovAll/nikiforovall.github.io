---
layout: post
title: "Testing with Playwright and Claude Code"
categories: [ ai ]
tags: [ playwright, testing, claude, mcp, automation, ai ]
published: true
shortinfo: "Discover how Playwright MCP Server and Claude Code can help you perform manual and exploratory testing of web applications."
fullview: false
comments: true
related: true
mermaid: true
---

## TL;DR

Learn how to use Playwright MCP servers with Claude Code slash commands to perform manual and exploratory testing of web applications. This combination gives Claude Code "eyes" to interact with browsers and helps bridge the gap between manual testing and automation.

**Source code:** <https://github.com/NikiforovAll/playwright-claude-code-demo>

## Introduction

Testing web applications often requires a mix of manual and automated testing. While automated tests catch regressions, manual testing helps us discover unexpected behaviors and usability issues. But what if we could combine the best of both worlds?

When you add a Playwright MCP server, Claude can directly interact with web browsers - navigate pages, click buttons, fill forms, and observe results just like a human tester would.

### What Makes This Combination Powerful

The magic happens when you combine three things:

1. **Playwright MCP Server** - Gives Claude browser automation capabilities
2. **Claude Code Slash Commands** - Create reusable testing workflows
3. **Manual Testing Approach with AI Assistance** - Let Claude explore and report findings. So instead of writing detailed test scripts, you can describe what you want to test in plain English, and Claude will handle the rest.

This setup is perfect for exploratory testing where you want to understand how an application behaves without writing formal test scripts first.

## Getting Started

First, you need to set up a Playwright MCP server and add following `.mcp.json` file to your project:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {}
    }
  }
}
```

Then configure it in your Claude Code MCP settings to connect the server. Once connected, Claude gets access to browser automation tools.

Here is my `.claude/settings.json` file:

```json
{
  "permissions": {
    "allow": [
      "Read(*)",
      "Search(*)",
      "Edit(*)",
      "Write(*)",
      "mcp__playwright__browser_navigate",
      "mcp__playwright__browser_evaluate",
      "mcp__playwright__browser_click",
      "mcp__playwright__browser_navigate_back",
      "mcp__playwright__browser_take_screenshot",
      "mcp__playwright__browser_close"
    ]
  },
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": [
    "playwright"
  ]
}
```

## Creating Custom Slash Commands

You can create custom slash commands to standardize your testing workflows. Here's an example of a manual testing command:

```markdown
---
description: Manually test a site and create a report
---

### Manual Testing Instructions

1. Use the Playwright MCP Server to manually test the scenario provided by the user. If no scenario is provided, ask the user to provide one.
2. Navigate to the url provided by the user and perform the described interactions. If no url is provided, ask the user to provide one.
3. Observe and verify the expected behavior, focusing on accessibility, UI structure, and user experience.
4. Report back in clear, natural language:
   - What steps you performed (navigation, interactions, assertions).
   - What you observed (outcomes, UI changes, accessibility results).
   - Any issues, unexpected behaviors, or accessibility concerns found.
5. Reference URLs, element roles, and relevant details to support your findings.

Example report format:
- **Scenario:** [Brief description]
- **Steps Taken:** [List of actions performed]
- **Outcome:** [What happened, including any assertions or accessibility checks]
- **Issues Found:** [List any problems or unexpected results]

Generate a .md file with the report in the `manual-tests` directory and include any relevant screenshots or snapshots.

Take screenshots or snapshots of the page if necessary to illustrate issues or confirm expected behavior.

Close the browser after completing the manual test.
```

Save this as `.claude/commands/pw-manual-testing.md` in your project.

### Real-World Example

Let's say you want to test a blog website. You can ask Claude:

```bash
/pw-manual-testing

Please test the blog navigation on https://nikiforovall.blog/ - specifically:
1. Load the homepage
2. Find and click on the first blog post
3. Verify the post loads correctly with all content sections
```

Claude will then use the Playwright MCP server to:

1. Navigate to the website
2. Identify page elements and structure
3. Click through the navigation
4. Analyze the results
5. Create a detailed test report

Here's what a typical report looks like:

```markdown
## Outcome Analysis

### ✅ Successful Results
1. **Page Navigation:** Successfully navigated from homepage to specific blog post
2. **URL Change:** Properly updated from homepage to post URL
3. **Content Loading:** Full blog post content loaded properly including:
   - Article header with publication date
   - Main content sections (TL;DR, Introduction, Getting Started, etc.)
   - Code examples and technical details
   - Related articles sidebar

### 🎯 Accessibility & UX Observations
- **Semantic HTML:** Proper use of headings, articles, and navigation elements
- **Link Accessibility:** Clear, descriptive link text for navigation
- **Content Organization:** Well-structured content with clear hierarchy

<!-- And so on... -->
```

💡 Check <https://github.com/NikiforovAll/playwright-claude-code-demo/blob/main/manual-tests/blog-post-navigation-test.md> for the generated test report.

### From Manual Testing to Automation

Once Claude has explored your application manually, you can ask it to generate Playwright tests based on the findings using `.claude/commands/pw-generate-tests.md` command:

```markdown
---
description: Generate Playwright tests based on user scenarios
---

# Context
Your goal is to generate a Playwright test based on the provided scenario after completing all prescribed steps.

## Your task
- You are given a scenario and you need to generate a playwright test for it. If the user does not provide a scenario, you will ask them to provide one.
- DO NOT generate test code based on the scenario alone.
- DO run steps one by one using the tools provided by the Playwright MCP.
- Only after all steps are completed, emit a Playwright TypeScript test that uses `@playwright/test` based on message history
- Save generated test file in the tests directory
- Execute the test file and iterate until the test passes
```

In our case, Claude might generate a test like this:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Blog Navigation Tests", () => {
  test("should navigate to blog post from homepage", async ({ page }) => {
    await page.goto("/");
    
    // Click on the first blog post title
    await page.getByRole("link").first().click();

    // Verify blog post content is loaded
    await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
  });
});
```

💡 See <https://github.com/NikiforovAll/playwright-claude-code-demo/tree/main/tests> for more examples of AI-generated Playwright tests.

## Why This Approach Works

This combination is particularly effective because:

- 👁️ **Claude can see the page** - Unlike traditional testing tools, Claude can understand the visual layout and content
- 🌱 **Natural language testing** - You describe what you want to test in plain English
- 🔎 **Exploratory by nature** - Claude can discover unexpected issues during testing
- 📖  **Documentation built-in** - Every test session generates detailed reports
- 🤖 **Easy transition to automation** - Manual findings easily become automated tests
- 📝 **Spec-driven** - You can use tests as specifications so Claude Code can validate the code against the spec. This can dramatically improve the correctness of the generated code because Claude Code can verify the code it generates.

### Practical Use Cases

This setup shines in several scenarios:

1. **New feature exploration** - Test features before writing automated tests
2. **Accessibility audits** - Claude can identify accessibility issues during exploration
3. **Cross-browser testing** - Quickly test the same flows across different browsers
4. **Regression testing** - Manually verify fixes before committing to automation
5. **User experience validation** - Test actual user workflows and identify pain points
6. **End-to-end testing** - Validate complete user journeys through the application

## Conclusion

Combining Playwright MCP Server with Claude Code creates a powerful testing environment. You get the flexibility of manual testing with the consistency of automation, all while building documentation and formal tests along the way.

The key benefit is that Claude Code gets "eyes" to see and interact with your web applications just like a human tester would, but with the consistency and reporting capabilities that manual testing usually lacks.

Try it out on your next web application - you might be surprised at what Claude discovers during its explorations!

## References

- <https://github.com/NikiforovAll/playwright-claude-code-demo>
- <https://docs.anthropic.com/en/docs/claude-code/slash-commands>
- <https://github.com/debs-obrien/debbie.codes/tree/main/.github/prompts>
- [CommitQuality - Playwright Test](https://www.youtube.com/playlist?list=PLXgRgGX8-5UVm9yioRY329rfcfy3MusiY)
- [Playwright MCP Server by Debbie O'Brien](https://www.youtube.com/playlist?list=PLtIMuymsF0jf9dnJNrNCE3mIl9_ekaXiw)
