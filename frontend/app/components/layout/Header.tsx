import Link from "next/link";
import MobileMenu from "@/app/components/layout/MobileMenu";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Services", href: "#services" },
  { label: "Pricing", href: "#pricing" },
  { label: "For Accountants", href: "#for-accountants" },
  { label: "GST Guide", href: "#gst-guide" },
  { label: "FAQ", href: "#faq" },
];

export default function Header() {
  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "saturate(180%) blur(14px)",
        WebkitBackdropFilter: "saturate(180%) blur(14px)",
        borderBottom: "1px solid var(--border-soft)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
      }}
    >
      <div className="container-page">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <LogoMark />
            <span className="font-extrabold text-[1.1rem] tracking-tight text-ink-900 leading-none">
              Invozen
            </span>
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-md tracking-wider"
              style={{ background: "rgba(13,148,136,0.1)", color: "#0d9488" }}
            >
              GST
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5" role="navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm font-semibold rounded-lg transition-all hover:bg-ink-100 hover:text-ink-900"
                style={{ color: "var(--text-muted)" }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all hover:bg-ink-100 text-ink-600"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="btn-glow inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-xl"
              style={{ boxShadow: "0 2px 8px rgba(13,148,136,0.25)" }}
            >
              Start Free →
            </Link>
          </div>

          {/* Mobile */}
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="30" height="30" rx="8" fill="#0d9488" />
      <rect x="8" y="8" width="9" height="14" rx="1.5" fill="white" opacity="0.9" />
      <rect x="14" y="8" width="8" height="2" rx="1" fill="white" opacity="0.5" />
      <rect x="14" y="12" width="8" height="2" rx="1" fill="white" opacity="0.35" />
      <path d="M8 20h14" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
