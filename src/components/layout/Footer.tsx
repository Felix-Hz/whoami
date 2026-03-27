import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="w-full bg-surface-inverse border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-16 py-8 md:py-16 lg:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left: brand */}
          <div className="flex flex-col gap-3 [&_*]:text-text-inverse">
            <Logo />
            <p className="text-text-inverse/60 text-sm max-w-xs">
              building software for humans.
              <br />
              simple &gt; complex.
            </p>
          </div>

          {/* Right: connect */}
          <div className="flex flex-col gap-4 md:items-end">
            <h3 className="text-text-inverse/40 uppercase text-xs tracking-[0.15em] font-[var(--font-body)]">
              connect
            </h3>
            <nav className="flex flex-col gap-2">
              <a
                href="/blog"
                className="text-text-inverse/70 hover:text-accent text-sm transition-colors duration-normal"
              >
                blog
              </a>
              <a
                href="https://www.linkedin.com/in/felix-hernandez-vieyra/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-inverse/70 hover:text-accent text-sm transition-colors duration-normal"
              >
                linkedin
              </a>
              <a
                href="https://github.com/Felix-Hz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-inverse/70 hover:text-accent text-sm transition-colors duration-normal"
              >
                github
              </a>
              <a
                href="mailto:me@felix-hzv.dev"
                className="text-text-inverse/70 hover:text-accent text-sm transition-colors duration-normal"
              >
                me@felix-hzv.dev
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-10 md:mt-16 pt-6 border-t border-text-inverse/10">
          <p className="text-text-inverse/40 text-xs">
            developed by yours truly, with much 🧉 &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
