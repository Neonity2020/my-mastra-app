export function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-matrix/10 border border-matrix/20 px-3 py-1 text-matrix text-xs font-semibold tracking-wide mb-4">
      {children}
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 leading-tight">{children}</h2>;
}

export function CodeBlock({ code, lang = 'bash', title }: { code: string; lang?: string; title?: string }) {
  return (
    <div className="my-4 rounded-lg overflow-hidden border border-matrix-border">
      {title && (
        <div className="flex items-center gap-2 bg-matrix-code px-4 py-2 text-[11px] text-zinc-500 border-b border-matrix-border">
          <span className="text-matrix/60">{lang}</span>
          <span className="text-zinc-700">─</span>
          <span>{title}</span>
        </div>
      )}
      <pre className="code-block !rounded-none !border-0 !mt-0"><code>{code}</code></pre>
    </div>
  );
}

export function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-5 py-4 text-sm">
      <div className="flex items-start gap-3">
        <span className="text-yellow-500 text-base shrink-0">⚠️</span>
        <div className="text-yellow-200/80 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-lg border border-matrix/20 bg-matrix/5 px-5 py-4 text-sm">
      <div className="flex items-start gap-3">
        <span className="text-matrix text-base shrink-0">💡</span>
        <div className="text-zinc-300 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export function TrapCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="trap-card my-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/20">{number}</span>
        <h4 className="text-sm font-bold text-zinc-200">{title}</h4>
      </div>
      <div className="text-sm text-zinc-400 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="check-item text-sm">
      <span className="text-matrix shrink-0 mt-0.5">☐</span>
      <span className="text-zinc-300">{children}</span>
    </div>
  );
}
