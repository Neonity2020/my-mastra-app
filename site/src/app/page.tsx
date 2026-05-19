import { Footer } from './components/footer';
import { Hero } from './components/hero';
import { Sidebar } from './components/sidebar';
import { Section1Overview } from './sections/s1-overview';
import { Section2Prereqs } from './sections/s2-prereqs';
import { Section3Mastra } from './sections/s3-mastra';
import { Section4Nextjs } from './sections/s4-nextjs';
import { Section5Tailwind } from './sections/s5-tailwind';
import { Section6Integration } from './sections/s6-integration';
import { Section7Deploy } from './sections/s7-deploy';
import { Section8Troubleshoot } from './sections/s8-troubleshoot';
import { QuickStart } from './sections/s9-quickstart';

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Hero />
        <div className="max-w-4xl mx-auto px-6 md:px-10 pb-32 space-y-24">
          <Section1Overview />
          <Section2Prereqs />
          <Section3Mastra />
          <Section4Nextjs />
          <Section5Tailwind />
          <Section6Integration />
          <Section7Deploy />
          <Section8Troubleshoot />
          <QuickStart />
        </div>
        <Footer />
      </main>
    </div>
  );
}
