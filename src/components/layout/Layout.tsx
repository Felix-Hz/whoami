import type { ComponentChildren } from "preact";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function Layout({ children }: { children: ComponentChildren }) {
  return (
    <div className="min-h-dvh flex flex-col bg-paper text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-accent focus:text-paper focus:px-4 focus:py-2 meta"
      >
        skip to content
      </a>
      <Header />
      <main id="main" className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
