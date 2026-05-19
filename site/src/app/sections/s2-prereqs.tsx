import { SectionTag, SectionTitle, CodeBlock, CheckItem, WarningBox } from '../components/shared';

export function Section2Prereqs() {
  return (
    <section id="s2">
      <SectionTag>§ 02</SectionTag>
      <SectionTitle>环境准备</SectionTitle>

      <div className="mt-6 text-zinc-400 leading-relaxed space-y-4 text-sm">
        <p>在开始构建之前，确保你的运行环境满足以下要求：</p>

        <div className="mt-6 space-y-2">
          <h3 className="text-zinc-200 font-bold text-base">系统依赖</h3>
          <CheckItem>Node.js ≥ 18.17（推荐 20.x LTS）</CheckItem>
          <CheckItem>Bun ≥ 1.0（本项目的包管理器）</CheckItem>
          <CheckItem>Git</CheckItem>
          <CheckItem>macOS / Linux（Windows 推荐 WSL2）</CheckItem>
        </div>

        <div className="mt-6 space-y-2">
          <h3 className="text-zinc-200 font-bold text-base">验证安装</h3>
          <CodeBlock
            lang="bash"
            title="检查版本"
            code={`$ node -v
v20.x.x

$ bun -v
1.x.x

$ git --version
git version 2.x.x`}
          />
        </div>

        <WarningBox>
          Bun 是本项目的指定包管理器。不要使用 npm 或 yarn，否则 lock 文件会冲突。
        </WarningBox>

        <div className="mt-6 space-y-2">
          <h3 className="text-zinc-200 font-bold text-base">API Keys</h3>
          <p>Mastra Agent 需要调用 LLM，确保以下环境变量已配置：</p>
          <CodeBlock
            lang="bash"
            title=".env"
            code={`OPENAI_API_KEY=sk-...
# 或
ANTHROPIC_API_KEY=sk-ant-...`}
          />
          <p className="text-xs text-zinc-600">
            对于静态文档站（site/）不需要任何 API key。
          </p>
        </div>
      </div>
    </section>
  );
}
