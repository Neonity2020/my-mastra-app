# 🚀 Nebuchadnezzar 构建指南

> **Tank's Build Guide for the Matrix**
> 
> 本指南覆盖 Mastra AI 后端 + Next.js 16 前端的完整构建流程。
> Tailwind CSS 的配置陷阱已在 §5 中重点标注。

---

## 目录

1. [项目总览](#1-项目总览)
2. [环境与前置条件](#2-环境与前置条件)
3. [后端构建 — Mastra Framework](#3-后端构建--mastra-framework)
4. [前端构建 — Next.js 16](#4-前端构建--nextjs-16)
5. [⚠️ Tailwind CSS 配置陷阱](#5-️-tailwind-css-配置陷阱)
6. [集成架构](#6-集成架构)
7. [构建与部署](#7-构建与部署)
8. [故障排除](#8-故障排除)

---

## 1. 项目总览

### 当前技术栈

```
┌─────────────────────────────────────────────┐
│            Nebuchadnezzar Matrix            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐    ┌──────────────────┐   │
│  │  Mastra AI   │    │   Next.js 16     │   │
│  │  Backend     │◄──►│   Frontend       │   │
│  │  (Bun/Node)  │    │   (App Router)   │   │
│  └──────┬───────┘    └──────┬───────────┘   │
│         │                   │               │
│  ┌──────▼───────┐    ┌─────▼────────────┐   │
│  │  Agents      │    │  Tailwind CSS 4  │   │
│  │  Tools       │    │  React 19        │   │
│  │  Workflows   │    │  Server Actions  │   │
│  │  Scorers     │    │  Streaming UI    │   │
│  └──────────────┘    └──────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  Storage Layer                       │   │
│  │  ├─ LibSQL (mastra.db) — default     │   │
│  │  └─ DuckDB — observability domain    │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 项目结构

```
my-mastra-app/
├── src/
│   ├── mastra/                    # Mastra AI 后端核心
│   │   ├── index.ts               # 中央入口：注册所有 agents/tools/workflows
│   │   ├── agents/
│   │   │   ├── coding-agent.ts    # 编码助手 Agent (zhipuai-coding-plan/glm-5.1)
│   │   │   └── weather-agent.ts   # 天气助手 Agent (openai/gpt-5-mini)
│   │   ├── tools/
│   │   │   ├── coding-tools.ts    # 文件读写、搜索、命令执行
│   │   │   └── weather-tool.ts    # 天气数据获取 (Open-Meteo API)
│   │   ├── workflows/
│   │   │   └── weather-workflow.ts # fetchWeather → planActivities
│   │   ├── scorers/
│   │   │   └── weather-scorer.ts  # 工具调用/完整性/翻译质量评分
│   │   └── public/                # 构建时复制的静态资源
│   ├── cli/                       # CLI 入口
│   │   ├── coding-agent.ts        # 交互式终端聊天 Agent
│   │   └── terminal-markdown.ts   # 终端 Markdown 渲染器
│   └── app/                       # [新增] Next.js 16 App Router
│       ├── layout.tsx
│       ├── page.tsx
│       ├── globals.css
│       └── chat/
│           └── page.tsx           # AI 聊天界面
├── package.json
├── tsconfig.json
├── next.config.ts                 # [新增]
├── postcss.config.mjs             # [新增]
├── tailwind.config.ts             # [新增] (仅当使用 v3 兼容模式)
└── BUILD_GUIDE.md                 # ← 你在这里
```

---

## 2. 环境与前置条件

### 系统要求

| 依赖         | 最低版本        | 推荐版本  | 安装方式                               |
|-------------|---------------|----------|----------------------------------------|
| Node.js     | >= 22.13.0    | 22 LTS   | `fnm install 22` 或 `nvm install 22`  |
| Bun         | latest        | >= 1.2   | `curl -fsSL https://bun.sh/install \| bash` |
| ripgrep     | any           | latest   | `brew install ripgrep`                |
| Git         | any           | latest   | 系统包管理器                            |

### 环境变量

创建 `.env` 文件（**绝不提交到 Git**）：

```bash
# ===== LLM Provider Keys =====
OPENAI_API_KEY=sk-...                    # GPT-5-mini (weather agent)
ZHIPUAI_API_KEY=...                      # GLM-5.1 (coding agent)

# ===== Mastra Platform (可选) =====
MASTRA_PLATFORM_ACCESS_TOKEN=...         # 部署到 Mastra Platform 时需要

# ===== CLI 模式标识 =====
# 手动运行 CLI 时自动设置，无需手动配置
# MASTRA_CLI=true
```

### 验证环境

```bash
node --version    # v22.x+
bun --version     # 1.2+
rg --version      # ripgrep
git --version
```

---

## 3. 后端构建 — Mastra Framework

### 3.1 安装依赖

```bash
bun install
```

当前依赖树：

```
@mastra/core          ^1.35.0   # 核心：Agent、Tool、Workflow、Memory
@mastra/memory        ^1.18.2   # 跨会话记忆
@mastra/duckdb        ^1.3.2    # 可观测性存储（仅 Studio 模式）
@mastra/libsql        ^1.11.0   # 默认存储
@mastra/evals         ^1.2.2    # 评分器框架
@mastra/loggers       ^1.1.1    # Pino 日志
@mastra/observability ^1.12.0   # 遥测与追踪
zod                   ^4         # Schema 验证
mastra                ^1.9.3    # CLI 工具（dev/superset build）
```

### 3.2 开发模式启动

```bash
bun run dev
# 等价于: mastra dev
# 启动 Mastra Studio → http://localhost:4111
```

**⚠️ 关键注意事项：**
- `mastra dev` 运行在 Node.js 下（非 Bun）
- Studio 运行时会锁定 `mastra.duckdb`，**不要同时运行 CLI**
- 如需同时使用 CLI，必须设置 `MASTRA_CLI=true` 以跳过 DuckDB

### 3.3 注册新模块

所有新增的 agents / tools / workflows / scorers **必须**在 `src/mastra/index.ts` 中注册：

```typescript
// src/mastra/index.ts
export const mastra = new Mastra({
  workflows: { weatherWorkflow, myNewWorkflow },
  agents: { weatherAgent, codingAgent, myNewAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new MastraCompositeStore({ /* ... */ }),
  logger: new PinoLogger({ name: 'Mastra', level: 'info' }),
});
```

### 3.4 CLI Agent

```bash
# 交互式聊天（持久化记忆）
bun run agent

# 单次执行
bun run agent -- "总结这个项目"

# 管道输入
echo "查找 codingAgent 的注册位置" | bun run agent

# 详细模式（显示工具调用）
bun run agent -- --verbose "搜索所有 Agent 定义"
```

### 3.5 生产构建

```bash
bun run build
# 等价于: mastra build
# 输出到 .build/output/

bun run start
# 启动生产服务器
```

---

## 4. 前端构建 — Next.js 16

### 4.1 为什么选择 Next.js 16

| 特性                    | Next.js 15     | Next.js 16          |
|------------------------|----------------|---------------------|
| React 版本             | 19             | 19                  |
| Turbopack              | 稳定           | 默认启用            |
| 缓存策略               | 默认缓存       | 默认不缓存（opt-in） |
| `next/image`           | 已有           | 改进的 AVIF/WebP    |
| Node.js 最低版本       | 18.18          | 22+                 |
| `after()` API          | 实验性         | 稳定                |
| `useState` 流式渲染    | 基础           | 完整 Streaming UI   |
| Tailwind CSS 支持      | v3/v4          | v4 原生             |

### 4.2 安装 Next.js 16

在现有项目根目录中添加：

```bash
bun add next@latest react@latest react-dom@latest
bun add -d @types/react @types/react-dom
```

> **注意：** Next.js 16 要求 Node.js >= 22，与本项目 `engines.node: ">=22.13.0"` 一致。

### 4.3 创建 Next.js 配置文件

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next.js 16 默认使用 Turbopack（dev 模式）
  // 无需手动配置 experimental.turbo

  // 与 Mastra Studio 的端口隔离
  // Mastra Studio: 4111, Next.js: 3000
  serverExternalPackages: [],

  // 禁用严格模式以避免 React 双重渲染（AI 流式响应更平滑）
  reactStrictMode: false,

  // 图片优化
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
```

### 4.4 TypeScript 配置

更新 `tsconfig.json` 以支持 Next.js：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "outDir": "dist",
    "jsx": "preserve",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "src/**/*",
    "next-env.d.ts",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

### 4.5 App Router 结构

```
src/app/
├── layout.tsx          # 根布局
├── page.tsx            # 首页
├── globals.css         # 全局样式（Tailwind 入口）
├── chat/
│   └── page.tsx        # AI 聊天页面
└── api/
    ├── mastra/
    │   └── route.ts    # Mastra API 代理
    └── chat/
        └── route.ts    # 聊天流式 API
```

#### 根布局 `src/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nebuchadnezzar — AI Agent Platform',
  description: 'Matrix-powered AI Agent Platform built with Mastra + Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
```

#### 首页 `src/app/page.tsx`

```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-green-400 sm:text-6xl">
          Nebuchadnezzar
        </h1>
        <p className="mt-6 text-lg leading-8 text-zinc-400">
          Welcome to the Matrix. AI Agents powered by Mastra.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/chat"
            className="rounded-md bg-green-500 px-6 py-3 text-sm font-semibold text-black shadow-sm hover:bg-green-400 transition-colors"
          >
            Enter the Matrix →
          </Link>
          <a
            href="http://localhost:4111"
            target="_blank"
            className="text-sm font-semibold leading-6 text-zinc-400 hover:text-zinc-200"
          >
            Mastra Studio ↗
          </a>
        </div>
      </div>
    </main>
  );
}
```

#### 聊天 API `src/app/api/chat/route.ts`

```tsx
import { mastra } from '@/mastra';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { message, agentId = 'coding-agent' } = await req.json();

  const agent = mastra.getAgentById(agentId);

  const result = await agent.stream(message, {
    memory: {
      resource: 'web-user',
      thread: 'web-chat',
    },
  });

  return new Response(result.textStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
```

#### 聊天页面 `src/app/chat/page.tsx`

```tsx
'use client';

import { useState, useRef } from 'react';

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!res.ok || !res.body) throw new Error('Request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: assistantContent };
          return next;
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Connection lost. Tank is trying to reconnect...' },
      ]);
    } finally {
      setLoading(false);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  };

  return (
    <div className="flex h-screen flex-col bg-black">
      {/* Header */}
      <header className="border-b border-green-500/30 px-6 py-4">
        <h1 className="text-lg font-bold text-green-400">
          💬 Operator Chat — Tank Online
        </h1>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-zinc-600 text-sm">
              Enter a message to start chatting with the Operator...
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-zinc-800 text-zinc-200'
              }`}
            >
              {msg.content || '█'}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Speak, Neo..."
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-md bg-green-500 px-6 py-2 text-sm font-semibold text-black hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Transmitting...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### 4.6 添加 npm 脚本

更新 `package.json` 的 `scripts` 部分：

```json
{
  "scripts": {
    "dev": "mastra dev",
    "dev:web": "next dev --turbopack --port 3000",
    "dev:all": "concurrently \"bun run dev\" \"bun run dev:web\"",
    "build": "mastra build",
    "build:web": "next build",
    "build:all": "bun run build && bun run build:web",
    "start": "mastra start",
    "start:web": "next start",
    "agent": "bun run src/cli/coding-agent.ts"
  }
}
```

安装 `concurrently`：

```bash
bun add -d concurrently
```

---

## 5. ⚠️ Tailwind CSS 配置陷阱

> **Tank 的警告：** 这部分是 Neo 们最容易踩雷的地方。逐条阅读！

### 5.1 Tailwind CSS v4 vs v3 — 你在用哪个？

Next.js 16 原生支持 **Tailwind CSS v4**。v4 是完全重写，配置方式天翻地覆。

| 方面              | v3                          | v4                              |
|------------------|-----------------------------|----------------------------------|
| 配置文件          | `tailwind.config.ts`        | `globals.css` 中的 `@theme`     |
| PostCSS 插件      | `tailwindcss`               | `@tailwindcss/postcss`          |
| 内容检测          | `content: [...]` 数组       | 自动检测（无需配置）            |
| 深色模式          | `darkMode: 'class'`        | 自动支持 `@variant dark`        |
| 自定义主题        | `theme.extend`             | `@theme { ... }` in CSS         |
| 颜色系统          | HEX/HSL 手动               | `oklch` 原生色彩空间            |

### 5.2 陷阱 #1：PostCSS 配置用了错误的包名

```bash
# ❌ 错误 — 这是 v3 的方式，v4 会完全失效
# postcss.config.mjs
#   plugins: { tailwindcss: {} }

# ✅ 正确 — v4 必须使用专用 PostCSS 插件
bun add -d @tailwindcss/postcss
```

```javascript
// postcss.config.mjs
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},   // ← 注意包名！不是 'tailwindcss'
  },
};

export default config;
```

**症状：** 样式完全不生效，但无报错。这是最常见的陷阱。

### 5.3 陷阱 #2：CSS 入口文件格式不对

```css
/* ❌ 错误 — v3 的方式 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ✅ 正确 — v4 只需要一行 */
@import "tailwindcss";
```

完整的 `src/app/globals.css`：

```css
@import "tailwindcss";

/* 自定义主题 — v4 方式 */
@theme {
  --color-matrix-green: #00ff41;
  --color-matrix-dark: #0a0a0a;
  --font-mono: 'Fira Code', 'JetBrains Mono', monospace;
}

/* 全局基础样式 */
@layer base {
  body {
    @apply bg-black text-zinc-100;
    font-family: var(--font-mono), ui-monospace, monospace;
  }

  /* 自定义滚动条 — Matrix 风格 */
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: var(--color-matrix-dark);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--color-matrix-green);
    border-radius: 3px;
  }
}

/* 深色模式 — v4 自动支持，无需额外配置 */
@variant dark (&:where(.dark, .dark *));
```

### 5.4 陷阱 #3：v4 不需要 `tailwind.config.ts`

```bash
# ❌ 删除这个文件！v4 不使用它
# tailwind.config.ts  ← 如果存在，可能导致冲突
```

v4 的所有自定义都在 CSS 的 `@theme` 块中完成。如果你有旧的 `tailwind.config.ts`，它会被忽略或导致意外行为。

### 5.5 陷阱 #4：`content` 路径不再需要手动配置

```typescript
// ❌ v3 方式 — v4 中完全不需要
// tailwind.config.ts
// content: ['./src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}']

// ✅ v4 自动检测项目中的模板文件
// 你不需要做任何事！
```

### 5.6 陷阱 #5：颜色格式变化

```css
/* ❌ v3 可以直接用 HEX */
/* theme.extend.colors.matrix: '#00ff41' */

/* ✅ v4 推荐使用 oklch，但也支持其他格式 */
@theme {
  --color-matrix-green: oklch(0.88 0.29 155);
  /* 或简单写法也行 */
  --color-matrix-green: #00ff41;
}
```

在模板中使用：

```tsx
// ✅ Tailwind 自动识别 @theme 中定义的颜色
<div className="bg-matrix-green text-matrix-dark">
```

### 5.7 陷阱 #6：`@apply` 在 v4 中行为变化

```css
/* v4 中 @apply 仍然可用，但某些情况下需要加 !important */
@layer components {
  .matrix-text {
    @apply !text-matrix-green !font-bold;
  }
}
```

### 5.8 陷阱 #7：Next.js 16 + Tailwind v4 安装命令

```bash
# 推荐方式：安装正确的 PostCSS 插件
bun add -d @tailwindcss/postcss

# 如果创建新项目，使用 canary 命令
bunx create-next-app@latest --tailwind --app --ts

# 确认版本
bunx tailwindcss --help  # 应显示 v4.x
```

### 5.9 完整的 Tailwind v4 清单

在开始之前，确认以下每一项：

- [ ] `postcss.config.mjs` 使用 `@tailwindcss/postcss`（不是 `tailwindcss`）
- [ ] CSS 入口用 `@import "tailwindcss"`（不是 `@tailwind` 三行）
- [ ] 删除了旧的 `tailwind.config.ts`（如有）
- [ ] 没有 `content` 数组配置
- [ ] 自定义主题在 `@theme {}` CSS 块中
- [ ] `package.json` 中没有 `tailwindcss` v3 的依赖（版本应为 4.x）
- [ ] 运行 `bun run dev:web` 后浏览器中能看到样式

---

## 6. 集成架构

### 6.1 端口分配

| 服务             | 端口   | 用途                    |
|-----------------|--------|------------------------|
| Mastra Studio   | 4111   | Agent 可视化调试        |
| Next.js Dev     | 3000   | 前端开发服务器          |
| Mastra API      | 4111   | 后端 API（Studio 内置） |

### 6.2 数据流

```
用户浏览器
    │
    ▼
Next.js (3000) ──POST /api/chat──► Mastra API (4111)
    │                                   │
    │◄─── Streaming Response ──────────┤
    │                                   │
    │                                   ▼
    │                            Mastra Agent
    │                                   │
    │                              ┌────┼────┐
    │                              │    │    │
    │                              ▼    ▼    ▼
    │                           Tools  LLM  Memory
    │                                   │
    │                              ┌────┼────┐
    │                              ▼         ▼
    │                          LibSQL     DuckDB
    │                        (mastra.db) (observability)
```

### 6.3 Mastra API 代理（可选）

如果不想直连 4111，可以通过 Next.js Route Handler 代理：

```typescript
// src/app/api/mastra/[...path]/route.ts
import { mastra } from '@/mastra';
import { NextRequest, NextResponse } from 'next/server';

// 直接在 Next.js 进程中调用 Mastra
// 避免跨进程通信
export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const body = await req.json();

  // 根据 path 分发到不同的 agent/tool/workflow
  if (path.startsWith('agents/')) {
    const agentId = path.split('/')[1];
    const agent = mastra.getAgentById(agentId);
    const result = await agent.generate(body.message, body.options);
    return NextResponse.json({ text: result.text });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

---

## 7. 构建与部署

### 7.1 开发模式

```bash
# 仅后端
bun run dev                # Mastra Studio @ :4111

# 仅前端
bun run dev:web            # Next.js @ :3000

# 同时启动（推荐）
bun run dev:all
```

### 7.2 生产构建

```bash
# 构建后端
bun run build              # → .build/output/

# 构建前端
bun run build:web          # → .next/

# 全量构建
bun run build:all
```

### 7.3 生产启动

```bash
# 后端
bun run start              # Mastra production server

# 前端
bun run start:web          # Next.js production server

# 或使用 Node.js
node .next/standalone/server.js
```

### 7.4 Docker 部署（参考）

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# 安装依赖
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 复制源码
COPY . .

# 构建
RUN bun run build:all

# 运行
EXPOSE 3000 4111
CMD ["sh", "-c", "bun run start & bun run start:web"]
```

### 7.5 Mastra Platform 部署

```bash
# 登录 Mastra Platform
mastra auth login

# 部署
mastra deploy
```

参考：https://mastra.ai/docs/mastra-platform/overview

---

## 8. 故障排除

### Mastra Studio 无法启动

```bash
# 清理锁定的数据库
rm -f mastra.db-wal mastra.db-shm mastra.duckdb.wal mastra.duckdb

# 确保 Node.js 版本正确
node --version  # >= 22.13.0

# 重新安装依赖
rm -rf node_modules bun.lock
bun install
```

### CLI 与 Studio 冲突

```bash
# 确保设置 CLI 模式
MASTRA_CLI=true bun run agent -- "test"
# CLI 入口已自动设置此变量
```

### Next.js 编译错误

```bash
# 清理 Next.js 缓存
rm -rf .next

# 确认 TypeScript 配置
bunx tsc --noEmit
```

### Tailwind 样式不生效

**按 §5.9 清单逐一排查：**

1. 确认 `@tailwindcss/postcss` 已安装并在 PostCSS 配置中
2. 确认 CSS 入口是 `@import "tailwindcss"`
3. 删除旧的 `tailwind.config.ts`
4. 重启开发服务器：`rm -rf .next && bun run dev:web`

### DuckDB 锁定错误

```
Error: database is locked
```

**原因：** Studio 和 CLI 同时访问 DuckDB。

**解决：**
```bash
# 方案 1：关闭 Studio 后再运行 CLI
# 方案 2：CLI 已自动跳过 DuckDB（MASTRA_CLI=true）
# 方案 3：手动设置环境变量
export MASTRA_CLI=true
```

---

## 附录：快速启动命令（复制粘贴版）

```bash
# 1. 安装所有依赖
bun install

# 2. 安装 Next.js 16 + Tailwind v4
bun add next@latest react@latest react-dom@latest
bun add -d @types/react @types/react-dom @tailwindcss/postcss concurrently

# 3. 创建配置文件（参见上方各节）

# 4. 启动开发
bun run dev:all
```

---

> *"Tank, Operator of Nebuchadnezzar, signing off. Good luck, Neo."* 🕶️
>
> 如有疑问，查阅 [Mastra 文档](https://mastra.ai/docs/) 或在 CLI 中运行 `bun run agent -- "你的问题"`
