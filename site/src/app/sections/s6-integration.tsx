import { SectionTag, SectionTitle, CodeBlock, InfoBox } from '../components/shared';

export function Section6Integration() {
  return (
    <section id="s6">
      <SectionTag>§ 06</SectionTag>
      <SectionTitle>Mastra × Next.js 集成</SectionTitle>

      <div className="mt-6 text-zinc-400 leading-relaxed space-y-4 text-sm">
        <p>后端和前端通过 API 路由 / REST 接口通信，不直接共享运行时。</p>

        <h3 className="text-zinc-200 font-bold text-base mt-6">架构图</h3>
        <CodeBlock
          lang="text"
          title="通信拓扑"
          code={`┌─────────────────────────────────────┐
│  Browser                            │
│  Next.js Static HTML (site/out/)    │
│         │                           │
│         │ fetch() / REST            │
│         ▼                           │
│  ┌──────────────────┐               │
│  │  Mastra Server   │ :4111         │
│  │  ├─ /api/agent/* │               │
│  │  ├─ /api/workflow│               │
│  │  └─ /api/tools/* │               │
│  └──────────────────┘               │
└─────────────────────────────────────┘`}
        />

        <h3 className="text-zinc-200 font-bold text-base mt-6">环境变量隔离</h3>
        <CodeBlock
          lang="bash"
          title="根目录 .env (Mastra)"
          code={`# Mastra 后端
OPENAI_API_KEY=sk-...
MASTRATELEMETRY_DISABLED=1`}
        />
        <CodeBlock
          lang="bash"
          title="site/.env.local (Next.js — 仅开发时)"
          code={`# 纯静态站不需要后端变量
# 如果需要代理 API 可配置：
NEXT_PUBLIC_API_URL=http://localhost:4111`}
        />

        <InfoBox>
          由于站点是 <code className="text-matrix">output: 'export'</code> 纯静态导出，
          所有动态数据交互发生在客户端 fetch 调用中，不经过 Next.js 服务端。
        </InfoBox>

        <h3 className="text-zinc-200 font-bold text-base mt-6">package.json 脚本整合</h3>
        <CodeBlock
          lang="json"
          title="根目录 package.json 添加站点脚本"
          code={`{
  "scripts": {
    "dev": "mastra dev",
    "build": "mastra build",
    "site:dev": "cd site && bun run dev",
    "site:build": "cd site && bun run build",
    "site:preview": "cd site && bun run start"
  }
}`}
        />
      </div>
    </section>
  );
}
