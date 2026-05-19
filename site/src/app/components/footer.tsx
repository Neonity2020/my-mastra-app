export function Footer() {
  return (
    <footer className="border-t border-matrix-border py-8 px-6 md:px-10">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
        <div>
          <span className="text-matrix font-semibold">Tank</span>, Operator of Nebuchadnezzar — Signing off.
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-matrix animate-pulse" />
          <span>System Online</span>
        </div>
      </div>
    </footer>
  );
}
