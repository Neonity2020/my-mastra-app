import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nebuchadnezzar — 构建指南',
  description: 'Mastra AI + Next.js 16 构建指南 — Tank Operator Manual',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-matrix-bg text-zinc-300 antialiased font-mono">
        {children}
      </body>
    </html>
  );
}
