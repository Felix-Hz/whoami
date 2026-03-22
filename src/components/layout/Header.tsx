import { useEffect, useState } from "preact/hooks";
import { Logo } from "@/components/ui/Logo";
import { Socials } from "@/components/ui/Socials";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 w-full p-4 lg:px-16 lg:py-6 flex justify-between items-center transition-all duration-normal ${
        scrolled ? "bg-surface-primary/80 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`}
    >
      <Logo />
      <Socials />
    </header>
  );
}
