import { useEffect, useRef, useState } from "react";

const LOGO = "/images/logo.png";

const navLinks = [
  { href: "#how", label: "How it Works" },
  { href: "#spaces", label: "Spaces" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={[
        "fixed top-0 inset-x-0 z-50",
        "bg-ink/60 backdrop-blur-xl border-b border-white/10",
        scrolled ? "shadow-lg shadow-black/10" : "",
      ].join(" ")}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 shrink-0 group">
          <img
            src={LOGO}
            alt="FlexiDesk"
            className="h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.03]"
          />
          <span className="text-sm font-semibold tracking-wide text-white hidden sm:block">
            FlexiDesk
          </span>
          <span className="sr-only">Go to homepage</span>
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-slate-200 hover:text-white transition relative after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-white/70 after:transition-all hover:after:w-full"
            >
              {l.label}
            </a>
          ))}

          <a
            href="/login"
            className="relative inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-brand text-ink font-semibold text-sm shadow-sm hover:opacity-90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Log in
          </a>
        </nav>

        <button
          className="md:hidden p-2 rounded-md border border-white/20 text-white hover:bg-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? (
            <svg width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6l-12 12" />
            </svg>
          ) : (
            <svg width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm" />

          <div
            id="mobile-menu"
            className="fixed top-14 inset-x-0 z-50 border-t border-white/10 bg-ink/90 text-white"
            role="dialog"
            aria-modal="true"
          >
            <div
              ref={panelRef}
              className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-3"
            >
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm hover:bg-white/10 hover:text-brand transition"
                >
                  {l.label}
                </a>
              ))}

              <div className="pt-2">
                <a
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block w-full px-4 py-2 rounded-full bg-brand text-ink font-semibold text-center shadow-sm hover:opacity-90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  Log in
                </a>
              </div>

              <p className="text-xs text-slate-300 pt-1">
                Press Esc to close
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
