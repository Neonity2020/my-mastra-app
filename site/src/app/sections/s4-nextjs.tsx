import { SectionTag, SectionTitle, CodeBlock, InfoBox } from '../components/shared';

export function Section4Nextjs() {
  return (
    <section id="s4">
      <SectionTag>§ 04</SectionTag>
      <SectionTitle>Next.js 16 前端构建</SectionTitle>

      <div className="mt-6 text-zinc-400 leading-relaxed space-y-4 text-sm">
        <h3 className="text-zinc-200 font-bold text-base">创建独立站点项目</h3>
        <p>
          静态文档站放在 <code className="text-matrix">site/</code> 子目录，与 Mastra 后端完全隔离：
        </p>
        <CodeBlock
          lang="bash"
          title="在项目根目录执行"
          code={`# 创建 site 目录并初始化
mkdir site && cd site

# 用 bun 初始化 Next.js 项目
bunx create-next-app@latest . \\
  --typescript \\
  --tailwind \\
  --app \\
  --no-src-dir \\
  --import-alias "@/*"

# 或手动创建（更可控）`}
        />

        <h3 className="text-zinc-200 font-bold text-base mt-6">关键配置文件</h3>

        <CodeBlock
          lang="typescript"
          title="site/next.config.ts"
          code={`import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',        // 纯静态输出
  reactStrictMode: false,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;`}
        />

        <InfoBox>
          <code className="text-matrix">output: 'export'</code> 让 Next.js 生成纯 HTML/CSS/JS，
          可部署到任何静态托管（GitHub Pages, Cloudflare Pages, Vercel 等）。
        </InfoBox>

        <h3 className="text-zinc-200 font-bold text-base mt-6">开发与构建</h3>
        <CodeBlock
          lang="bash"
          title="site/ 下的命令"
          code={`cd site

# 开发模式（Turbopack 加速）
bun run dev

# 构建静态产物 → site/out/
bun run build

# 预览构建结果
bun run start`}
        />

        <CodeBlock
          lang="text"
          title="构建产物结构"
          code={`site/out/
├── index.html          # 首页
├── _next/static/       # JS/CSS/font
└── ...`}
        />
      </div>
    </section>
  );
}
