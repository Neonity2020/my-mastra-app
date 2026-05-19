'use client';

import { useState, useEffect } from 'react';

const sections = [
  { id: 'hero', label: '⌂ Top' },
  { id: 's1', label: '01 总览' },
  { id: 's2', label: '02 环境' },
  { id: 's3', label: '03 Mastra' },
  { id: 's4', label: '04 Next.js 16' },
  { id: 's5', label: '05 Tailwind ⚠️' },
  { id: 's6', label: '06 集成' },
  { id: 's7', label: '07 部署' },
  { id: 's8', label: '08 排障' },
  { id: 's9', label: '09 快速开始' },
];

export function Sidebar() {
  const [activeId, setActiveId] = useState('hero');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden rounded-md bg-matrix-card border border-matrix-border p-2 text-matrix"
        aria-label="Toggle navigation"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h14M3 10h14M3 14h14" />
        </svg>
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full w-56 border-r border-matrix-border bg-matrix-bg/95 backdrop-blur-sm transition-transform md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-matrix-border">
          <div className="text-matrix font-bold text-sm tracking-wider">TANK</div>
          <div className="text-zinc-600 text-xs mt-0.5">Build Guide v1.0</div>
        </div>
        <nav className="p-3 space-y-0.5">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setMobileOpen(false)}
              className={`block rounded px-3 py-2 text-xs transition-colors ${
                activeId === s.id
                  ? 'bg-matrix/10 text-matrix font-semibold'
                  : 'nav-link hover:bg-matrix/5'
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="absolute bottom-4 left-0 right-0 px-5">
          <div className="text-[10px] text-zinc-700 leading-relaxed">
            Nebuchadnezzar<br />Operator Manual<br />
            <span className="text-matrix/50">● ONLINE</span>
          </div>
        </div>
      </aside>
    </>
  );
}
