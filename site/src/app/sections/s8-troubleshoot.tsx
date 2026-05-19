import { SectionTag, SectionTitle, CodeBlock, TrapCard } from '../components/shared';

export function Section8Troubleshoot() {
  return (
    <section id="s8">
      <SectionTag>§ 08</SectionTag>
      <SectionTitle>常见问题与排障</SectionTitle>

      <div className="mt-6 text-zinc-400 leading-relaxed space-y-4 text-sm">
        <TrapCard number={1} title="样式不生效 / 页面无样式">
          <p>检查 PostCSS 配置是否使用了 v4 插件名：</p>
          <CodeBlock lang="diff" title="postcss.config.mjs" code={`- tailwindcss: {}      // ✗ v3 写法，v4 不识别
+ '@tailwindcss/postcss': {}  // ✓ v4 写法`} />
          <p className="text-xs text-zinc-500 mt-2">确认 globals.css 第一行是 <code className="text-matrix">@import &quot;tailwindcss&quot;</code></p>
        </TrapCard>

        <TrapCard number={2} title="bg-matrix 等自定义类不存在">
          <p>检查 <code className="text-matrix">@theme</code> 中变量是否以 <code className="text-matrix">--color-</code> 开头：</p>
          <CodeBlock lang="diff" title="globals.css" code={`- --matrix: #00ff41;       // ✗ 不生成工具类
+ --color-matrix: #00ff41;  // ✓ 生成 bg-matrix text-matrix 等`} />
        </TrapCard>

        <TrapCard number={3} title="Mastra build 失败 — 找不到模块">
          <p>确保根目录 tsconfig.json 的 paths 没有把 <code>src/*</code> 映射到 Next.js 的源码。Mastra 和站点各自独立配置：</p>
          <CodeBlock lang="text" title="隔离原则" code={`根目录 tsconfig.json  → Mastra (src/mastra/)
site/tsconfig.json   → Next.js (site/src/app/)`} />
        </TrapCard>

        <TrapCard number={4} title="bun install 冲突 / phantom 依赖">
          <p>两个 package.json 不要交叉引用。site/ 有自己的 node_modules：</p>
          <CodeBlock lang="bash" title="清理重装" code={`# 根目录
bun install

# 站点（独立安装）
cd site && bun install`} />
        </TrapCard>

        <TrapCard number={5} title="静态导出后路由 404">
          <p>确保 <code className="text-matrix">next.config.ts</code> 设置了 <code className="text-matrix">trailingSlash: true</code>，否则子路由在静态托管上会 404。</p>
        </TrapCard>

        <TrapCard number={6} title="图片不显示 (Static Export)">
          <p><code className="text-matrix">output: 'export'</code> 不支持 Next.js 图片优化。必须设置：</p>
          <CodeBlock lang="typescript" code={`images: { unoptimized: true }`} />
        </TrapCard>
      </div>
    </section>
  );
}
