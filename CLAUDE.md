# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A **Mastra** (TypeScript) application. Runtime is Bun; `mastra dev` itself runs under Node (`engines.node >=22.13.0`). Before doing anything Mastra-specific, load the `mastra` skill at `.agents/skills/mastra/SKILL.md` — Mastra's APIs change frequently across versions and cached knowledge will be wrong.

## Commands

```bash
bun run dev      # Start Mastra Studio on http://localhost:4111 (long-running; use a separate terminal)
bun run build    # Production build via `mastra build`
bun run start    # Run the built server
bun run agent -- "<prompt>"   # Invoke the coding agent CLI (see below)
```

There is no test runner wired up yet. If you add tests, use `bun test` (see Bun section below).

### Coding agent CLI

`bun run agent` (`src/cli/coding-agent.ts`) is a standalone entry point that imports `mastra` and calls `codingAgent.generate(prompt)`. Prompts come from argv or stdin. Flags: `--json`, `--plain`, `--verbose`, `-h`. Examples:

```bash
bun run agent -- "List the project files and summarize this project"
echo "Find where codingAgent is registered" | bun run agent
```

The CLI sets `MASTRA_CLI=true` before importing `mastra` — `src/mastra/index.ts` keys off this to disable observability and the DuckDB observability domain (DuckDB has process-locking that breaks when Studio is already running). **Anything that imports `./mastra` from outside `mastra dev` must set `MASTRA_CLI=true` first**, otherwise it will conflict with a running Studio over `mastra.duckdb`.

## Architecture

Single Mastra instance in `src/mastra/index.ts` wires together everything; **new agents, tools, workflows, and scorers must be registered here** or they won't be discoverable.

- **Storage**: `MastraCompositeStore` with `LibSQLStore` (`mastra.db`) as the default and a `DuckDBStore` mounted at the `observability` domain. The DuckDB store is conditionally omitted in CLI mode (see above).
- **Observability**: `Observability` is also gated on `!isCli`, exporting to both Mastra Storage and Mastra Platform (when `MASTRA_PLATFORM_ACCESS_TOKEN` is set) with `SensitiveDataFilter` redacting passwords/tokens.
- **Agents**:
  - `weatherAgent` (`openai/gpt-5-mini`) — uses `weatherTool` and runs three scorers (tool-call accuracy, completeness, LLM-judged translation quality) at 100% sampling. Called by `weatherWorkflow.planActivities` via `mastra.getAgent('weatherAgent')`.
  - `codingAgent` (`zhipuai-coding-plan/glm-5.1`) — uses `codingTools` and is fetched in the CLI by id via `mastra.getAgentById('coding-agent')`.
- **Coding tools** (`src/mastra/tools/coding-tools.ts`): `listFiles`, `readFile`, `writeFile`, `searchCode` (ripgrep), `runCommand`. All paths are confined to `process.cwd()` via `resolveWorkspacePath`, hidden dirs and `.git`/`node_modules`/`.mastra`/`.build`/`dist`/`coverage` are skipped by default, and `runCommand` refuses anything matching `\b(rm|sudo|chmod|chown|mkfs|dd)\b`. Preserve these guards when editing.
- **Workflows**: `weatherWorkflow` chains two `createStep` blocks (`fetchWeather` → `planActivities`) and **must call `.commit()`** before export (see `src/mastra/workflows/weather-workflow.ts:183`).
- **Scorers**: Two prebuilt (`createToolCallAccuracyScorerCode`, `createCompletenessScorer`) plus a custom `createScorer` pipeline (`preprocess` → `analyze` with `outputSchema` → `generateScore` → `generateReason`) — follow this pattern for new LLM-judged scorers.

## Conventions

- Always use Zod schemas for tool `inputSchema`/`outputSchema` and step schemas.
- Don't touch `.env`, `node_modules`, `.git`, or the generated `mastra.db*` / `mastra.duckdb*` files. The duckdb WAL/lock files in particular cause confusing errors if hand-edited.
- Models are passed as `provider/model` string IDs (e.g. `'openai/gpt-5-mini'`), not constructor objects.

## Bun (default runtime)

Default to Bun over Node.js — `bun.lock` is the lockfile.

- `bun <file>` over `node`/`ts-node`; `bun test` over `jest`/`vitest`; `bun install` over `npm`/`yarn`/`pnpm`; `bunx` over `npx`.
- Bun auto-loads `.env` — don't add `dotenv`.
- Prefer Bun built-ins: `Bun.serve()` (with routes + WebSockets) over `express`; `bun:sqlite` over `better-sqlite3`; `Bun.redis` over `ioredis`; `Bun.sql` over `pg`/`postgres.js`; built-in `WebSocket` over `ws`; `Bun.file` over `node:fs` read/write; `` Bun.$`...` `` over `execa`.
- Frontend: use HTML imports with `Bun.serve()` — don't add `vite`. `<script type="module" src="./frontend.tsx">` and `<link>` to CSS work directly; React/Tailwind are supported.
- Bun docs live in `node_modules/bun-types/docs/**.mdx`.

Note: `mastra dev`/`mastra build` themselves invoke a Node-based pipeline (hence `engines.node`), but everything else (scripts, the agent CLI, tests) should go through Bun.
