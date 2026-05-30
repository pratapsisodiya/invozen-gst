import Link from "next/link";
import MobileMenu from "@/app/components/layout/MobileMenu";
import BrandMark from "@/app/components/layout/BrandMark";

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
            <BrandMark size={30} />
            <span className="font-extrabold text-[1.1rem] tracking-tight text-ink-900 leading-none">
              Invozen
            </span>
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-md tracking-wider"
              style={{ background: "rgba(34,197,94,0.12)", color: "#166534" }}
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
              className="btn-glow inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700"
              style={{ boxShadow: "0 2px 8px rgba(22,101,52,0.22)" }}
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
