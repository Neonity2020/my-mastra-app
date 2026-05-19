import { SectionTag, SectionTitle, CodeBlock, WarningBox, TrapCard, InfoBox } from '../components/shared';

export function Section5Tailwind() {
  return (
    <section id="s5">
      <SectionTag>§ 05 ⚠️</SectionTag>
      <SectionTitle>Tailwind CSS v4 陷阱与配置</SectionTitle>

      <div className="mt-6 text-zinc-400 leading-relaxed space-y-4 text-sm">
        <p className="text-yellow-200/90 font-medium">
          这是本指南最重要的章节。Tailwind v4 有多个破坏性变更，容易踩坑。
        </p>

        <TrapCard number={1} title="v4 不再使用 tailwind.config.js">
          <p>Tailwind CSS v4 改用 CSS-first 配置。所有主题变量在 <code className="text-matrix">globals.css</code> 中通过 <code className="text-matrix">@theme</code> 声明。</p>
          <CodeBlock
            lang="css"
            title="正确做法 — globals.css"
            code={`@import "tailwindcss";

@theme {
  --color-matrix: #00ff41;
  --color-matrix-dim: #00cc33;
  --color-matrix-bg: #0a0a0a;
  --color-matrix-border: #1a3a1a;
  --font-mono: 'JetBrains Mono', monospace;
}`}
          />
          <p className="text-red-400/80 text-xs">✗ 不要创建 tailwind.config.js / .ts</p>
        </TrapCard>

        <TrapCard number={2} title="PostCSS 插件名称变更">
          <p>v4 的 PostCSS 插件从 <code className="text-red-400">tailwindcss</code> 改为 <code className="text-matrix">@tailwindcss/postcss</code>。</p>
          <CodeBlock
            lang="javascript"
            title="site/postcss.config.mjs — 正确"
            code={`/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},  // ✓ v4 写法
  },
};

export default config;`}
          />
          <WarningBox>
            如果写了 <code>tailwindcss: &#123;&#125;</code>，PostCSS 会找不到插件，样式完全失效且不报错。
          </WarningBox>
        </TrapCard>

        <TrapCard number={3} title="@apply 指令在 v4 中不稳定">
          <p>
            Tailwind v4 对 <code className="text-matrix">@apply</code> 的处理有变化。
            推荐使用组件封装或 CSS class 组合代替。
          </p>
          <CodeBlock
            lang="tsx"
            title="✓ 用 className 替代 @apply"
            code={`// ✗ 避免
// .btn { @apply bg-matrix text-black font-bold rounded px-4 py-2; }

// ✓ 用 React 组件
function Button({ children }) {
  return (
    <button className="bg-matrix text-black font-bold rounded px-4 py-2">
      {children}
    </button>
  );
}`}
          />
        </TrapCard>

        <TrapCard number={4} title="自定义颜色需要 --color- 前缀">
          <p>
            <code className="text-matrix">@theme</code> 中定义的颜色变量必须以 <code className="text-matrix">--color-</code> 开头，
            Tailwind 才能将其识别为工具类（如 <code>bg-matrix</code>、<code>text-matrix</code>）。
          </p>
          <CodeBlock
            lang="css"
            title="命名规则"
            code={`/* ✓ 正确 — 生成 bg-matrix, text-matrix 等 */
--color-matrix: #00ff41;

/* ✗ 错误 — Tailwind 不识别 */
--matrix: #00ff41;`}
          />
        </TrapCard>

        <InfoBox>
          本站所有样式都是 Tailwind v4 工具类 + <code className="text-matrix">@theme</code> 变量 + 少量自定义 CSS class。
          查看 <code className="text-matrix">site/src/app/globals.css</code> 获取完整参考。
        </InfoBox>
      </div>
    </section>
  );
}
