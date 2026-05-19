# Mastra Coding Agent 简介

## 目录

- [什么是 Mastra？](#什么是-mastra)
- [核心概念](#核心概念)
- [架构总览](#架构总览)
- [快速上手](#快速上手)
- [核心模块详解](#核心模块详解)
- [实战示例：构建一个 Coding Agent](#实战示例构建一个-coding-agent)
- [最佳实践](#最佳实践)
- [生态与扩展](#生态与扩展)
- [总结](#总结)

---

## 什么是 Mastra？

**Mastra** 是一个开源的 **TypeScript AI Agent 框架**，旨在让开发者能够以类型安全、模块化的方式构建生产级 AI Agent 应用。它的设计哲学是：

> **像写普通 TypeScript 代码一样编写 AI Agent。**

Mastra 提供了从 LLM 调用、工具定义（Tools）、工作流编排（Workflows）、到 Agent 编排（Agents）的全栈抽象层，使开发者可以专注于业务逻辑，而非底层集成细节。

### 关键特性

| 特性 | 说明 |
|------|------|
| 🔷 **TypeScript 原生** | 完整的类型推导与安全，`.ts` 一等公民 |
| 🛠 **工具系统 (Tools)** | 用 Zod Schema 声明式定义工具输入/输出 |
| 🔄 **工作流引擎 (Workflows)** | 基于 DAG 的步骤编排，支持条件分支、并行、重试 |
| 🤖 **Agent 编排** | 支持 ReAct、Prompt Chaining、路由等 Agent 模式 |
| 📊 **可观测性** | 内置日志、指标、追踪，方便调试与监控 |
| 🔌 **多模型支持** | 统一接口适配 OpenAI、Anthropic、Google Gemini 等 |
| 💾 **向量存储 & RAG** | 内置 Embedding 与检索增强生成支持 |
| 🧪 **可测试** | 工具和工作流均可独立单元测试 |

---

## 核心概念

### 1. Agent（智能体）

Agent 是 Mastra 的顶层抽象，它拥有：

- **身份（Identity）**：名称、描述、系统提示词
- **模型（Model）**：绑定的 LLM（如 GPT-4o、Claude 3.5）
- **工具（Tools）**：可调用的能力集合
- **记忆（Memory）**：对话历史与上下文管理

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

const codingAgent = new Agent({
  name: "Coding Assistant",
  instructions: `你是一个专业的编程助手，擅长代码审查、重构和问题诊断。`,
  model: openai("gpt-4o"),
  tools: { /* ... */ },
});
```

### 2. Tool（工具）

Tool 是 Agent 可以调用的原子能力。Mastra 使用 **Zod** 来声明输入/输出的 JSON Schema，确保类型安全。

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const readFileTool = createTool({
  id: "readFile",
  description: "读取指定路径的文件内容",
  inputSchema: z.object({
    filePath: z.string().describe("文件路径"),
  }),
  outputSchema: z.object({
    content: z.string().describe("文件内容"),
    size: z.number().describe("文件大小（字节）"),
  }),
  execute: async ({ context }) => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(context.filePath, "utf-8");
    return {
      content,
      size: Buffer.byteLength(content),
    };
  },
});
```

### 3. Workflow（工作流）

Workflow 是多步骤任务的编排引擎，支持：

- **串行 / 并行** 步骤
- **条件分支**（条件路由）
- **循环 / 重试**
- **人机协作**（Human-in-the-loop）

```typescript
import { Workflow, Step } from "@mastra/core/workflows";

const codeReviewWorkflow = new Workflow({
  name: "Code Review Pipeline",
  triggerSchema: z.object({
    prUrl: z.string(),
  }),
});

const analyzeStep = new Step({
  id: "analyze",
  execute: async ({ context }) => {
    // 分析 PR 变更
  },
});

const reviewStep = new Step({
  id: "review",
  execute: async ({ context }) => {
    // 生成代码审查意见
  },
});

codeReviewWorkflow
  .step(analyzeStep)
  .then(reviewStep);

codeReviewWorkflow.commit();
```

### 4. Memory（记忆）

Mastra 提供 Memory 机制来管理对话上下文：

- **短期记忆**：当前会话的对话历史
- **长期记忆**：跨会话的持久化信息
- **工作记忆**：当前任务相关的临时状态

---

## 架构总览

```
┌─────────────────────────────────────────────────┐
│                   Your Application              │
├─────────────────────────────────────────────────┤
│                                                 │
│   ┌───────────┐   ┌───────────┐   ┌──────────┐ │
│   │   Agent    │   │ Workflow  │   │   RAG    │ │
│   │           │   │           │   │          │ │
│   │ ┌───────┐ │   │ ┌───────┐ │   │ ┌──────┐ │ │
│   │ │ Model │ │   │ │ Step  │ │   │ │Vector│ │ │
│   │ └───────┘ │   │ └───────┘ │   │ │Store │ │ │
│   │ ┌───────┐ │   │ ┌───────┐ │   │ └──────┘ │ │
│   │ │Tools  │ │   │ │Trigger│ │   │ ┌──────┐ │ │
│   │ └───────┘ │   │ └───────┘ │   │ │Embed │ │ │
│   │ ┌───────┐ │   │ ┌───────┐ │   │ └──────┘ │ │
│   │ │Memory │ │   │ │Condition│ │   └──────────┘ │
│   │ └───────┘ │   │ └───────┘ │                 │
│   └───────────┘   └───────────┘                 │
│                                                 │
├─────────────────────────────────────────────────┤
│              @mastra/core (核心层)               │
├─────────────────────────────────────────────────┤
│   AI SDK  │  Zod  │  Telemetry  │  Storage      │
└─────────────────────────────────────────────────┘
```

---

## 快速上手

### 安装

```bash
# 初始化项目
npx create-mastra@latest

# 或手动安装
npm install @mastra/core @ai-sdk/openai zod
```

### 项目结构

```
my-mastra-app/
├── src/
│   └── mastra/
│       ├── agents/          # Agent 定义
│       │   └── coding.ts
│       ├── tools/           # Tool 定义
│       │   ├── readFile.ts
│       │   └── writeFile.ts
│       ├── workflows/       # Workflow 定义
│       │   └── codeReview.ts
│       └── index.ts         # Mastra 实例入口
├── package.json
└── tsconfig.json
```

### 创建 Mastra 实例

```typescript
// src/mastra/index.ts
import { Mastra } from "@mastra/core";
import { codingAgent } from "./agents/coding";
import { codeReviewWorkflow } from "./workflows/codeReview";

export const mastra = new Mastra({
  agents: { codingAgent },
  workflows: { codeReviewWorkflow },
});
```

### 启动 Agent 交互

```typescript
const agent = mastra.getAgent("codingAgent");

const result = await agent.generate("请帮我检查这段代码是否有内存泄漏风险", {
  // 可传入上下文
});

console.log(result.text);
```

---

## 核心模块详解

### 📡 模型层（Model）

Mastra 基于 [Vercel AI SDK](https://sdk.vercel.ai/) 实现模型层，统一了不同 LLM 提供商的调用接口：

```typescript
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

// 轻松切换模型
const agent = new Agent({
  model: openai("gpt-4o"),           // OpenAI
  // model: anthropic("claude-3.5-sonnet"),  // Anthropic
  // model: google("gemini-1.5-pro"),        // Google
});
```

### 🔧 工具层（Tools）

工具是 Agent 感知外部世界和执行操作的唯一途径。设计原则：

1. **单一职责**：每个工具只做一件事
2. **声明式 Schema**：用 Zod 描述输入输出
3. **可组合**：工具可被多个 Agent 复用
4. **可测试**：execute 函数可独立测试

```typescript
// 典型 Coding Agent 工具集
const tools = {
  listFiles: listFilesTool,
  readFile: readFileTool,
  writeFile: writeFileTool,
  searchCode: searchCodeTool,
  runCommand: runCommandTool,
};
```

### 🔄 工作流引擎（Workflows）

工作流适合处理**确定性**的多步骤任务：

```typescript
const workflow = new Workflow({ name: "refactor-pipeline" })
  .step(analyzeStep)
  .then(planStep)
  .then(executeStep)
  .then(testStep);

// 条件分支
workflow.step(reviewStep, {
  when: { "testStep.result.passed": false },
});
```

### 🧠 Agent 决策模式

Mastra 支持多种 Agent 模式：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **ReAct** | 推理-行动循环，Agent 自主选择工具并迭代 | 开放式问题、探索性任务 |
| **Tool-calling** | 单轮工具调用，直接返回结果 | 简单查询、结构化任务 |
| **Multi-Agent** | 多个 Agent 协作，通过路由分发任务 | 复杂系统、职责分离 |
| **Workflow-driven** | 预定义工作流驱动，Agent 在步骤中参与 | 流程化任务、审批链路 |

---

## 实战示例：构建一个 Coding Agent

下面展示如何构建一个具备代码阅读、搜索、编辑能力的 Coding Agent。

### Step 1：定义工具

```typescript
// src/mastra/tools/codeTools.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const listFilesTool = createTool({
  id: "list-files",
  description: "列出指定目录下的文件",
  inputSchema: z.object({
    directory: z.string().default("."),
    pattern: z.string().optional(),
  }),
  outputSchema: z.object({
    files: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    // 实现文件列表逻辑
    return { files: [] };
  },
});

export const readFileTool = createTool({
  id: "read-file",
  description: "读取文件内容",
  inputSchema: z.object({
    path: z.string().describe("文件路径"),
  }),
  outputSchema: z.object({
    content: z.string(),
  }),
  execute: async ({ context }) => {
    const fs = await import("fs/promises");
    return { content: await fs.readFile(context.path, "utf-8") };
  },
});

export const searchCodeTool = createTool({
  id: "search-code",
  description: "搜索代码中的文本模式",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词或正则表达式"),
    directory: z.string().default("."),
  }),
  outputSchema: z.object({
    matches: z.array(z.object({
      file: z.string(),
      line: z.number(),
      text: z.string(),
    })),
  }),
  execute: async ({ context }) => {
    // 实现代码搜索逻辑
    return { matches: [] };
  },
});

export const editFileTool = createTool({
  id: "edit-file",
  description: "编辑指定文件，支持精确替换",
  inputSchema: z.object({
    path: z.string(),
    oldContent: z.string().describe("要替换的原始内容"),
    newContent: z.string().describe("替换后的新内容"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ context }) => {
    const fs = await import("fs/promises");
    let content = await fs.readFile(context.path, "utf-8");
    content = content.replace(context.oldContent, context.newContent);
    await fs.writeFile(context.path, content, "utf-8");
    return { success: true };
  },
});
```

### Step 2：定义 Agent

```typescript
// src/mastra/agents/coding.ts
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { listFilesTool, readFileTool, searchCodeTool, editFileTool } from "../tools/codeTools";

export const codingAgent = new Agent({
  name: "coding-agent",
  instructions: `你是一个专业的编程助手 Agent。你可以：

1. **浏览代码**：使用 list-files 和 read-file 工具了解项目结构
2. **搜索代码**：使用 search-code 工具查找特定模式
3. **编辑代码**：使用 edit-file 工具进行精确的代码修改

工作原则：
- 修改前先读取相关文件，理解上下文
- 使用精确替换而非整个文件重写
- 修改后验证语法正确性
- 遵循项目现有的代码风格`,
  model: openai("gpt-4o"),
  tools: {
    listFiles: listFilesTool,
    readFile: readFileTool,
    searchCode: searchCodeTool,
    editFile: editFileTool,
  },
});
```

### Step 3：使用 Agent

```typescript
// src/main.ts
import { codingAgent } from "./mastra/agents/coding";

async function main() {
  const result = await codingAgent.generate(
    "请检查 src/utils/helper.ts 文件中是否有未处理的异常，并修复它们。"
  );

  console.log(result.text);
}

main();
```

---

## 最佳实践

### ✅ DO（推荐做法）

1. **工具粒度适中**：每个工具做一件事，但不要太细碎
2. **清晰的工具描述**：Agent 依赖工具描述来选择合适的工具
3. **严格的 Zod Schema**：输入输出都要定义完整的 Schema
4. **系统提示词要具体**：给 Agent 明确的行为边界和偏好
5. **错误处理**：工具 execute 中妥善处理异常，返回有意义的错误信息
6. **可观测性**：利用 Mastra 内置的 telemetry 追踪 Agent 行为
7. **测试工具**：对工具的 execute 函数编写单元测试

### ❌ DON'T（避免做法）

1. **不要在工具中硬编码密钥**：使用环境变量
2. **不要给 Agent 过多工具**：工具过多会导致选择困难，建议 ≤ 10 个
3. **不要忽略输出 Schema**：无 Schema 的输出难以被下游处理
4. **不要在工作流中放模糊逻辑**：工作流适合确定性流程
5. **不要让 Agent 无限制执行**：设置最大迭代次数，防止无限循环

---

## 生态与扩展

### 官方包

| 包名 | 说明 |
|------|------|
| `@mastra/core` | 核心框架，包含 Agent、Tool、Workflow |
| `@mastra/mcp` | Model Context Protocol 集成 |
| `@mastra/memory` | 高级记忆管理（短期 / 长期 / 工作记忆） |
| `@mastra/pg` | PostgreSQL 向量存储适配器 |
| `@mastra/upstash` | Upstash 向量存储适配器 |
| `@mastra/telemetry` | OpenTelemetry 可观测性集成 |

### 社区集成

- **LangChain 集成**：复用 LangChain 丰富的工具生态
- **MCP 协议**：通过 `@mastra/mcp` 接入 MCP 服务器，获取标准化工具
- **Serverless 部署**：支持 Vercel、Cloudflare Workers 等无服务器平台

---

## 总结

Mastra 为 TypeScript 开发者提供了一个**工程化、类型安全、可扩展**的 AI Agent 开发框架：

```
Mastra = TypeScript + AI SDK + Zod + DAG Workflow + Agent Orchestration
```

它的核心价值在于：

1. **降低门槛**：TypeScript 开发者无需学习新语言，直接上手
2. **提升可靠性**：类型安全 + Schema 验证 + 可观测性
3. **灵活编排**：从简单工具调用到复杂工作流，渐进式复杂度
4. **生产就绪**：错误处理、重试机制、监控追踪一应俱全

> 🚀 **开始构建你的第一个 Mastra Agent：**
> ```bash
> npx create-mastra@latest
> ```

---

*本文档基于 Mastra 框架编写，更多详情请参考 [Mastra 官方文档](https://mastra.ai)。*
