import { SectionTag, SectionTitle, CodeBlock, InfoBox } from '../components/shared';

export function Section1Overview() {
  return (
    <section id="s1">
      <SectionTag>§ 01</SectionTag>
      <SectionTitle>项目总览</SectionTitle>

      <div className="mt-6 text-zinc-400 leading-relaxed space-y-4 text-sm">
        <p>
          本项目由两大子系统组成：Mastra AI 后端与 Next.js 16 前端。后端负责 AI Agent 编排与工具调用，前端作为纯静态站点展示构建文档。
        </p>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="rounded-lg border border-matrix-border bg-matrix-card p-5">
            <div className="text-matrix text-xs font-bold mb-2 tracking-wider">MASTRA BACKEND</div>
            <ul className="text-xs text-zinc-400 space-y-1.5">
              <li>• @mastra/core — 核心框架</li>
              <li>• @mastra/libsql — LibSQL 存储</li>
              <li>• @mastra/duckdb — DuckDB 分析存储</li>
              <li>• @mastra/loggers — Pino 日志</li>
              <li>• @mastra/observability — 可观测性</li>
            </ul>
          </div>
          <div className="rounded-lg border border-matrix-border bg-matrix-card p-5">
            <div className="text-matrix text-xs font-bold mb-2 tracking-wider">NEXT.JS FRONTEND</div>
            <ul className="text-xs text-zinc-400 space-y-1.5">
              <li>• Next.js 16 (App Router)</li>
              <li>• React 19</li>
              <li>• Tailwind CSS v4</li>
              <li>• output: &apos;export&apos; — 纯静态</li>
              <li>• TypeScript 严格模式</li>
            </ul>
          </div>
        </div>

        <InfoBox>
          本站本身就是这个构建流程的产物 — 用 Next.js 16 + Tailwind v4 生成的纯静态 HTML。
        </InfoBox>

        <p className="text-xs text-zinc-600 mt-4">项目结构概览：</p>
        <CodeBlock
          lang="text"
          title="目录结构"
          code={`my-mastra-app/
├── src/
│   ├── mastra/           # AI 后端
│   │   ├── index.ts      # Mastra 入口
│   │   ├── agents/       # Agent 定义
│   │   ├── tools/        # 工具函数
│   │   ├── workflows/    # 工作流
│   │   └── scorers/      # 评分器
│   └── cli/              # CLI 工具
├── site/                 # ← 静态文档站（独立项目）
│   ├── src/app/          # Next.js App Router
│   ├── package.json      # 独立依赖
│   ├── next.config.ts
│   └── postcss.config.mjs
├── package.json          # Mastra 依赖
└── tsconfig.json         # Mastra TypeScript 配置`}
        />
      </div>
    </section>
  );
}
