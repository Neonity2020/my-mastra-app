import { SectionTag, SectionTitle, CodeBlock, InfoBox } from '../components/shared';

export function Section7Deploy() {
  return (
    <section id="s7">
      <SectionTag>§ 07</SectionTag>
      <SectionTitle>部署</SectionTitle>

      <div className="mt-6 text-zinc-400 leading-relaxed space-y-4 text-sm">
        <p>后端和前端分别部署：</p>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="rounded-lg border border-matrix-border bg-matrix-card p-5">
            <div className="text-matrix text-xs font-bold mb-3 tracking-wider">MASTRA 后端</div>
            <ul className="text-xs text-zinc-400 space-y-2">
              <li>• Railway / Render / Fly.io</li>
              <li>• Docker 容器化部署</li>
              <li>• 需要持久化存储（LibSQL / DuckDB）</li>
              <li>• 环境变量注入 API Keys</li>
            </ul>
            <CodeBlock lang="bash" title="Docker" code={`docker build -t mastra-app .
docker run -p 4111:4111 \\
  -e OPENAI_API_KEY=sk-... \\
  mastra-app`} />
          </div>
          <div className="rounded-lg border border-matrix-border bg-matrix-card p-5">
            <div className="text-matrix text-xs font-bold mb-3 tracking-wider">静态站点</div>
            <ul className="text-xs text-zinc-400 space-y-2">
              <li>• Vercel / Netlify / Cloudflare Pages</li>
              <li>• GitHub Pages（零成本）</li>
              <li>• 产物在 <code>site/out/</code></li>
              <li>• 无需服务端运行时</li>
            </ul>
            <CodeBlock lang="bash" title="Cloudflare Pages" code={`# Build command
cd site && bun run build

# Output directory
site/out`} />
          </div>
        </div>

        <InfoBox>
          静态站部署零成本、零维护。推荐 Cloudflare Pages — 全球 CDN + 自动 HTTPS + 无限带宽。
        </InfoBox>
      </div>
    </section>
  );
}
