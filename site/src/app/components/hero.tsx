export function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden border-b border-matrix-border">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-matrix) 1px, transparent 1px), linear-gradient(90deg, var(--color-matrix) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative max-w-4xl mx-auto px-6 md:px-10 pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-block w-2 h-2 rounded-full bg-matrix animate-pulse" />
          <span className="text-matrix text-xs tracking-[0.3em] uppercase font-semibold">
            Tank — Operator Online
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-matrix matrix-glow leading-tight">
          Nebuchadnezzar
          <br />
          <span className="text-zinc-200 matrix-glow-subtle">构建指南</span>
        </h1>
        <p className="mt-6 text-base md:text-lg text-zinc-400 max-w-xl leading-relaxed">
          Mastra AI 后端 + Next.js 16 前端的完整构建流程。
          <br />
          Tailwind CSS 配置陷阱已在{' '}
          <a href="#s5" className="text-matrix underline underline-offset-4 hover:text-matrix-dim">§5</a> 中重点标注。
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a href="#s9" className="inline-flex items-center gap-2 rounded-md bg-matrix px-6 py-3 text-sm font-bold text-black hover:bg-matrix-dim transition-colors">
            快速开始 →
          </a>
          <a href="#s1" className="inline-flex items-center gap-2 rounded-md border border-matrix-border px-6 py-3 text-sm text-matrix hover:bg-matrix/5 transition-colors">
            阅读全文
          </a>
        </div>
        <div className="mt-12 flex flex-wrap gap-6 text-xs text-zinc-600">
          <span>Next.js 16</span><span className="text-zinc-800">│</span>
          <span>Tailwind CSS v4</span><span className="text-zinc-800">│</span>
          <span>React 19</span><span className="text-zinc-800">│</span>
          <span>Mastra Framework</span><span className="text-zinc-800">│</span>
          <span>TypeScript</span>
        </div>
      </div>
    </section>
  );
}
