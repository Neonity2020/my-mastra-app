import { SectionTag, SectionTitle, CodeBlock, InfoBox } from '../components/shared';

export function QuickStart() {
  return (
    <section id="s9">
      <SectionTag>§ 09</SectionTag>
      <SectionTitle>快速开始 — 5 分钟搭建</SectionTitle>

      <div className="mt-6 text-zinc-400 leading-relaxed space-y-4 text-sm">
        <CodeBlock
          lang="bash"
          title="1. 克隆 & 安装 Mastra 后端"
          code={`git clone <repo> && cd my-mastra-app
bun install`}
        />

        <CodeBlock
          lang="bash"
          title="2. 配置环境变量"
          code={`cp .env.example .env
# 编辑 .env 填入 OPENAI_API_KEY`}
        />

        <CodeBlock
          lang="bash"
          title="3. 启动 Mastra 开发服务器"
          code={`bun run dev
# → http://localhost:4111`}
        />

        <CodeBlock
          lang="bash"
          title="4. 安装并启动静态站点"
          code={`cd site
bun install
bun run dev
# → http://localhost:3000`}
        />

        <CodeBlock
          lang="bash"
          title="5. 构建静态产物"
          code={`cd site
bun run build
# 产物在 site/out/ — 可直接部署`}
        />

        <InfoBox>
          至此，你已经完成了 Mastra AI 后端 + Next.js 16 静态文档站的完整构建。
          <br /><br />
          <span className="text-matrix font-bold">Tank, Operator of Nebuchadnezzar</span> — 准备就绪。
        </InfoBox>

        <div className="mt-8 p-6 rounded-lg border border-matrix/30 bg-matrix/5 text-center">
          <div className="text-matrix text-lg font-bold matrix-glow">● SYSTEM ONLINE</div>
          <div className="text-zinc-500 text-xs mt-2">Nebuchadnezzar Build Guide v1.0</div>
        </div>
      </div>
    </section>
  );
}
