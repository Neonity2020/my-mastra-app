# my-mastra-app

Welcome to your new [Mastra](https://mastra.ai/) project! We're excited to see what you'll build.

## Getting Started

Start the development server:

```shell
bun run dev
```

Open [http://localhost:4111](http://localhost:4111) in your browser to access [Mastra Studio](https://mastra.ai/docs/studio/overview). It provides an interactive UI for building and testing your agents, along with a REST API that exposes your Mastra application as a local service. This lets you start building without worrying about integration right away.

You can start editing files inside the `src/mastra` directory. The development server will automatically reload whenever you make changes.

## Coding Agent CLI

Run the coding agent directly from the terminal:

```shell
bun run agent -- "List the project files and summarize this project"
```

The coding agent currently uses your configured Zhipu coding plan model: `zhipuai-coding-plan/glm-5.1`.

You can also pipe a prompt through stdin:

```shell
echo "Find where codingAgent is registered" | bun run agent
```

Start an interactive chat session:

```shell
bun run agent
```

Chat mode uses a persistent default memory thread, so context carries across CLI sessions for the same `--user`.
For long builds, the agent may stop at checkpoints. Type `继续` or `continue` to resume the previous task from the saved continuation state.

The agent also maintains durable project memory in `MEMORY.md`. It can autonomously compress valuable long-lived context, such as user preferences, project decisions, working agreements, environment quirks, and continuation state. It should avoid storing secrets, transient logs, or low-value chat history.

Resume a named chat thread:

```shell
bun run agent -- --thread work-session
```

Start a temporary fresh chat thread:

```shell
bun run agent -- --new-thread
```

Start chat mode with an initial prompt:

```shell
bun run agent -- --chat "Review the CLI renderer and suggest next improvements"
```

Chat commands:

```text
/help             Show available commands
/context          Show current runtime and workspace context
/memory           Show durable project memory from MEMORY.md
/remember <text>  Save a concise durable memory to MEMORY.md
/tools            List the coding tools
/model [name]     Show or switch the active model
/thread           Show the active memory thread and resource
/clear            Start a fresh memory thread
/new              Start a fresh memory thread
/default          Switch back to the default cross-session thread
/exit, /quit      Leave chat mode
```

Useful flags:

```shell
bun run agent -- --verbose "Search for codingAgent"
bun run agent -- --json "List available tools"
bun run agent -- --plain "Return Markdown without terminal rendering"
bun run agent -- --no-progress "Hide live tool progress logs"
```

By default, CLI responses are rendered as terminal Markdown with headings, lists, links, tables, inline code, fenced code blocks, and lightweight syntax highlighting. Tables are wrapped to the terminal width, and you can override that width with `COLUMNS=80`.

## Learn more

To learn more about Mastra, visit our [documentation](https://mastra.ai/docs/). Your bootstrapped project includes example code for [agents](https://mastra.ai/docs/agents/overview), [tools](https://mastra.ai/docs/agents/using-tools), [workflows](https://mastra.ai/docs/workflows/overview), [scorers](https://mastra.ai/docs/evals/overview), and [observability](https://mastra.ai/docs/observability/overview).

If you're new to AI agents, check out our [course](https://mastra.ai/learn) and [YouTube videos](https://youtube.com/@mastra-ai). You can also join our [Discord](https://discord.gg/BTYqqHKUrf) community to get help and share your projects.

## Deploy to the Mastra platform

The [Mastra platform](https://projects.mastra.ai) provides two products for deploying and managing AI applications built with the Mastra framework:

- **Studio**: A hosted visual environment for testing agents, running workflows, and inspecting traces
- **Server**: A production deployment target that runs your Mastra application as an API server

Learn more in the [Mastra platform documentation](https://mastra.ai/docs/mastra-platform/overview).
