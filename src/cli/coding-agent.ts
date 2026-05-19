#!/usr/bin/env bun
process.env.MASTRA_CLI ??= 'true';
process.env.MASTRA_PLATFORM_ACCESS_TOKEN ??= '';

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { renderMarkdown } from './terminal-markdown';

const DEFAULT_MODEL = 'zhipuai-coding-plan/glm-5.1';
const DEFAULT_THREAD = 'coding-agent-cli-default';

type CliOptions = {
  json: boolean;
  plain: boolean;
  verbose: boolean;
  progress: boolean;
  help: boolean;
  chat: boolean;
  newThread: boolean;
  thread?: string;
  user?: string;
  model?: string;
  promptParts: string[];
};

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    json: false,
    plain: false,
    verbose: false,
    progress: true,
    help: false,
    chat: false,
    newThread: false,
    promptParts: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--plain') {
      options.plain = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--no-progress') {
      options.progress = false;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--chat') {
      options.chat = true;
    } else if (arg === '--new-thread') {
      options.newThread = true;
    } else if (arg === '--thread') {
      options.thread = args[++i];
    } else if (arg.startsWith('--thread=')) {
      options.thread = arg.slice('--thread='.length);
    } else if (arg === '--user') {
      options.user = args[++i];
    } else if (arg.startsWith('--user=')) {
      options.user = arg.slice('--user='.length);
    } else if (arg === '--model') {
      options.model = args[++i];
    } else if (arg.startsWith('--model=')) {
      options.model = arg.slice('--model='.length);
    } else {
      options.promptParts.push(arg);
    }
  }

  return options;
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    return '';
  }

  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8').trim();
}

function printHelp(): void {
  console.log(`Usage:
  bun run agent                                Enter interactive chat mode (when stdin is a TTY)
  bun run agent -- "Summarize this project"   One-shot prompt
  echo "Find codingAgent" | bun run agent      Pipe a prompt via stdin

Options:
  --chat              Force chat mode even if a prompt is provided
  --thread <id>       Resume a named memory thread
  --new-thread        Start a temporary new memory thread
  --user <id>         Resource identifier for memory (default: $USER or "cli-user")
  --model <name>      Override the agent's default model for this run
  --json              Print the full Mastra generate result as JSON (one-shot only)
  --plain             Print responses without Markdown rendering
  --verbose           Print a short tool-call summary after the response (one-shot only)
  --no-progress       Hide live tool progress logs
  -h, --help          Show this help message

Slash commands (chat mode):
  /help               Show available commands
  /context            Show current runtime and workspace context
  /memory             Show durable project memory from MEMORY.md
  /remember <text>    Save a concise durable memory to MEMORY.md
  /tools              List the tools available to the agent
  /model [name]       Show or switch the active model
  /thread             Show the active memory thread and resource
  /clear              Start a fresh memory thread
  /default            Switch back to the default cross-session thread
  /exit, /quit        Leave chat mode`);
}

function getToolCallSummary(result: unknown): string[] {
  const steps = (result as { steps?: unknown[] }).steps;

  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.flatMap((step) => {
    const toolCalls = (step as { toolCalls?: unknown[] }).toolCalls;

    if (!Array.isArray(toolCalls)) {
      return [];
    }

    return toolCalls.map((toolCall) => {
      const payload = (toolCall as { payload?: { toolName?: string } }).payload;
      const toolName = payload?.toolName ?? 'unknown-tool';

      return `- ${toolName}`;
    });
  });
}

function newThreadId(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = Math.random().toString(36).slice(2, 8);
  return `chat-${stamp}-${suffix}`;
}

function defaultThreadId(): string {
  return process.env.MASTRA_AGENT_THREAD || DEFAULT_THREAD;
}

function defaultResourceId(): string {
  return process.env.USER || process.env.USERNAME || 'cli-user';
}

type AnyAgent = Awaited<ReturnType<typeof getCodingAgent>>;

async function getCodingAgent() {
  const { mastra } = await import('../mastra');
  return mastra.getAgentById('coding-agent');
}

async function runOneShot(
  prompt: string,
  options: CliOptions,
  agent: AnyAgent,
): Promise<void> {
  const generateOptions: Record<string, unknown> = {};

  if (options.thread) {
    generateOptions.memory = {
      resource: options.user ?? defaultResourceId(),
      thread: options.thread,
    };
  }

  if (options.model) {
    generateOptions.model = options.model;
  }

  const hasOptions = Object.keys(generateOptions).length > 0;
  const result = hasOptions
    ? await agent.generate(prompt, generateOptions as never)
    : await agent.generate(prompt);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const responseText = result.text ?? '';
  console.log(options.plain ? responseText : renderMarkdown(responseText));

  if (options.verbose) {
    const toolCalls = getToolCallSummary(result);

    if (toolCalls.length > 0) {
      console.error(`\nTool calls:\n${toolCalls.join('\n')}`);
    }
  }
}

type ChatState = {
  resource: string;
  thread: string;
  model: string;
  workspaceSummary: string;
};

function chatRuntimeContext(state: ChatState): string {
  const persistent = state.thread === defaultThreadId();

  return `[CLI runtime context]
- You are running in Mastra CLI chat mode.
- Memory resource/user: ${state.resource}
- Memory thread: ${state.thread}
- Cross-session memory: ${persistent ? 'enabled via the default persistent thread' : 'enabled for this named thread when reused'}
- Durable project memory: MEMORY.md is available through read-memory and update-memory.
- The user can inspect the active thread with /thread, start a new thread with /new, and switch back to the default persistent thread with /default.
${state.workspaceSummary}

User message:
`;
}

function isContinueRequest(prompt: string): boolean {
  const normalized = prompt.trim().toLowerCase();
  return /^(继续|接着来|接着做|继续吧|continue|go on|resume|proceed|next)$/.test(normalized);
}

function normalizeChatPrompt(prompt: string): string {
  if (!isContinueRequest(prompt)) {
    return prompt;
  }

  return `Continue the previous coding/build task from this memory thread. Use the last continuation state, inspect the current workspace if needed, then perform the next concrete step. Do not ask me to restate the task unless there is no previous task in memory. Original user command: ${prompt}`;
}

async function workspaceSummaryText(): Promise<string> {
  const { getWorkspaceContext, readProjectMemory } = await import('../mastra/tools/coding-tools');
  const context = await getWorkspaceContext();
  const scripts = Object.keys(context.scripts);
  const dirtyFiles = context.dirtyFiles.slice(0, 12);
  const importantFiles = context.importantFiles.slice(0, 20);
  const memory = await readProjectMemory();
  const memoryBullets = memory
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .slice(-8);

  return `[Workspace context]
- cwd: ${context.cwd}
- package: ${context.packageName || 'unknown'}
- package manager: ${context.packageManager}
- git branch: ${context.gitBranch ?? 'unknown'}
- scripts: ${scripts.length ? scripts.join(', ') : 'none'}
- dirty files: ${dirtyFiles.length ? dirtyFiles.join('; ') : 'none'}
- important files: ${importantFiles.length ? importantFiles.join(', ') : 'none'}
- MEMORY.md recent entries: ${memoryBullets.length ? memoryBullets.join(' | ') : 'none yet'}`;
}

async function printContext(state: ChatState): Promise<void> {
  state.workspaceSummary = await workspaceSummaryText();
  console.log(`${chatRuntimeContext(state)}<next user message omitted>`);
}

function printChatBanner(state: ChatState): void {
  console.log(`Coding Agent chat — model: ${state.model}`);
  console.log(`Thread: ${state.thread}  •  Resource: ${state.resource}`);
  console.log(`Type /help for commands, /exit to leave. Ctrl+D also exits.\n`);
}

async function printChatResponse(
  prompt: string,
  state: ChatState,
  options: CliOptions,
  agent: AnyAgent,
): Promise<void> {
  const message = `${chatRuntimeContext(state)}${normalizeChatPrompt(prompt)}`;
  const executionOptions = {
    memory: { resource: state.resource, thread: state.thread },
    model: state.model,
  } as never;

  if (options.plain) {
    const stream = await agent.stream(message, executionOptions);

    for await (const chunk of stream.textStream) {
      output.write(chunk);
    }
    output.write('\n');
    return;
  }

  const result = await agent.generate(message, executionOptions);
  const responseText = result.text ?? '';
  console.log(renderMarkdown(responseText));
}

async function handleSlashCommand(
  line: string,
  state: ChatState,
): Promise<'continue' | 'exit'> {
  const [command, ...rest] = line.trim().slice(1).split(/\s+/);
  const arg = rest.join(' ').trim();

  switch (command) {
    case 'exit':
    case 'quit':
      console.log('Bye.');
      return 'exit';

    case 'help':
      console.log(`Commands:
  /help            Show this message
  /context         Show current runtime and workspace context
  /memory          Show durable project memory from MEMORY.md
  /remember <text> Save a concise durable memory to MEMORY.md
  /tools           List the tools available to the agent
  /model [name]    Show the active model, or switch to <name> (e.g. openai/gpt-5-mini)
  /thread          Show the active memory thread and resource
  /clear           Start a fresh memory thread
  /new             Start a fresh memory thread
  /default         Switch back to the default cross-session thread
  /exit, /quit     Leave chat mode`);
      return 'continue';

    case 'context':
      await printContext(state);
      return 'continue';

    case 'memory': {
      const { readProjectMemory } = await import('../mastra/tools/coding-tools');
      console.log(renderMarkdown(await readProjectMemory()));
      return 'continue';
    }

    case 'remember': {
      if (!arg) {
        console.log('Usage: /remember <concise durable memory>');
        return 'continue';
      }

      const { updateProjectMemory } = await import('../mastra/tools/coding-tools');
      const result = await updateProjectMemory({ category: 'Facts', memory: arg });
      state.workspaceSummary = await workspaceSummaryText();
      console.log(result.added ? `Saved to ${result.filePath}.` : `Already present in ${result.filePath}.`);
      return 'continue';
    }

    case 'tools': {
      const { codingTools } = await import('../mastra/tools/coding-tools');
      const names = Object.values(codingTools).map((tool) => {
        const id = (tool as { id?: string }).id ?? 'unknown';
        const description = (tool as { description?: string }).description ?? '';
        return `  - ${id}${description ? `  — ${description}` : ''}`;
      });
      console.log(`Tools available to the coding agent:\n${names.join('\n')}`);
      return 'continue';
    }

    case 'model':
      if (!arg) {
        console.log(`Current model: ${state.model}`);
      } else {
        state.model = arg;
        console.log(`Model switched to: ${state.model}`);
      }
      return 'continue';

    case 'thread':
      console.log(`Thread: ${state.thread}\nResource: ${state.resource}`);
      return 'continue';

    case 'clear':
    case 'new':
      state.thread = newThreadId();
      console.log(`Started a new thread: ${state.thread}`);
      return 'continue';

    case 'default':
      state.thread = defaultThreadId();
      console.log(`Switched to default cross-session thread: ${state.thread}`);
      return 'continue';

    default:
      console.log(`Unknown command: /${command}. Try /help.`);
      return 'continue';
  }
}

async function runChat(options: CliOptions, agent: AnyAgent, initialPrompt = ''): Promise<void> {
  const state: ChatState = {
    resource: options.user ?? defaultResourceId(),
    thread: options.thread ?? (options.newThread ? newThreadId() : defaultThreadId()),
    model: options.model ?? DEFAULT_MODEL,
    workspaceSummary: await workspaceSummaryText(),
  };

  printChatBanner(state);

  if (initialPrompt) {
    console.log(`> ${initialPrompt}`);
    try {
      await printChatResponse(initialPrompt, state, options, agent);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\nError: ${message}\n`);
    }

    if (!process.stdin.isTTY) {
      return;
    }
  }

  const rl = readline.createInterface({ input, output, terminal: true });
  rl.on('SIGINT', () => {
    output.write('\n(press Ctrl+D or type /exit to leave)\n');
    rl.prompt();
  });

  while (true) {
    let line: string;
    try {
      line = await rl.question('> ');
    } catch {
      break;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('/')) {
      const result = await handleSlashCommand(trimmed, state);
      if (result === 'exit') break;
      continue;
    }

    try {
      await printChatResponse(trimmed, state, options, agent);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\nError: ${message}\n`);
    }
  }

  rl.close();
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  process.env.MASTRA_CLI_PROGRESS = options.progress ? 'true' : 'false';

  if (options.help) {
    printHelp();
    return;
  }

  const argvPrompt = options.promptParts.join(' ').trim();
  const piped = argvPrompt ? '' : await readStdin();
  const prompt = argvPrompt || piped;

  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  const shouldChat = options.chat || (!prompt && interactive);

  if (!prompt && !shouldChat) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const agent = await getCodingAgent();

  if (shouldChat) {
    await runChat(options, agent, prompt);
    return;
  }

  await runOneShot(prompt, options, agent);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
