import { SectionTag, SectionTitle, CodeBlock, InfoBox } from '../components/shared';

export function Section3Mastra() {
  return (
    <section id="s3">
      <SectionTag>§ 03</SectionTag>
      <SectionTitle>Mastra 后端构建</SectionTitle>

      <div className="mt-6 text-zinc-400 leading-relaxed space-y-4 text-sm">
        <h3 className="text-zinc-200 font-bold text-base">安装依赖</h3>
        <CodeBlock lang="bash" title="根目录安装 Mastra 依赖" code={`bun add @mastra/core @mastra/libsql @mastra/duckdb @mastra/loggers @mastra/observability`} />

        <h3 className="text-zinc-200 font-bold text-base mt-6">Mastra 入口文件</h3>
        <CodeBlock
          lang="typescript"
          title="src/mastra/index.ts"
          code={`import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent, codingAgent },
  storage: new LibSQLStore({
    url: "file:./mastra.db",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});`}
        />

        <InfoBox>
          Mastra 使用 <code className="text-matrix">LibSQLStore</code> 作为默认存储，DuckDB 用于可观测性数据分析。
          两者通过 <code className="text-matrix">MastraCompositeStore</code> 组合。
        </InfoBox>

        <h3 className="text-zinc-200 font-bold text-base mt-6">Agent 定义模式</h3>
        <CodeBlock
          lang="typescript"
          title="src/mastra/agents/weather-agent.ts"
          code={`import { Agent } from '@mastra/core/agent';
import { weatherTool } from '../tools/weather-tool';

export const weatherAgent = new Agent({
  name: 'Weather Agent',
  instructions: 'You are a weather assistant...',
  model: { model: openai('gpt-4o'), provider: 'openai' },
  tools: { weatherTool },
});`}
        />

        <h3 className="text-zinc-200 font-bold text-base mt-6">启动开发服务器</h3>
        <CodeBlock lang="bash" title="Mastra dev" code={`bun run dev`} />
        <p className="text-xs text-zinc-600">
          默认监听 <code className="text-matrix">http://localhost:4111</code>
        </p>
      </div>
    </section>
  );
}
