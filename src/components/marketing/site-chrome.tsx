import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function MarketingHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-6 sm:px-8 lg:px-10">
      <Link href="/" className="ar-serif text-[22px] leading-none" aria-label="Agent Room home">
        Agent Room
      </Link>

      <nav className="hidden items-center gap-7 text-sm text-[var(--ar-text-muted)] md:flex">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} className="transition hover:text-[var(--ar-text-strong)]">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/login" className="hidden text-sm text-[var(--ar-text-muted)] transition hover:text-[var(--ar-text-strong)] sm:inline-flex">
          Sign in
        </Link>
        <Link href="/signup" className="ar-pill-primary min-h-10 px-5 py-2 text-sm">
          Get started
        </Link>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-5 pb-10 pt-16 sm:px-8 lg:px-10">
      <div className="border-t border-[var(--ar-border)] pt-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Link href="/" className="ar-serif text-[24px] leading-none">
              Agent Room
            </Link>
            <p className="mt-3 text-sm text-[var(--ar-text-muted)]">Get your hours back.</p>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ar-text-faint)]">
            © 2026 Agent Room · Privacy · Terms · Status
          </div>
        </div>
      </div>
    </footer>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="ar-marketing-page overflow-hidden font-sans">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </main>
  );
}
