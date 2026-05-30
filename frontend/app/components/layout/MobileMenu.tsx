"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { MenuIcon, CloseIcon, ArrowRightIcon } from "@/app/components/ui/Icons";
import BrandMark from "@/app/components/layout/BrandMark";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Services", href: "#services" },
  { label: "Pricing", href: "#pricing" },
  { label: "For Accountants", href: "#for-accountants" },
  { label: "GST Guide", href: "#gst-guide" },
  { label: "FAQ", href: "#faq" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleScroll = () => setOpen(false);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="lg:hidden flex items-center">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-md text-zinc-600 hover:text-teal-600 hover:bg-teal-50 transition-colors"
        className="p-2 rounded-md text-zinc-600 hover:text-green-600 hover:bg-green-50 transition-colors"
      >
        {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-80 max-w-[90vw] z-50 flex flex-col"
        style={{
          background: "var(--bg)",
          borderLeft: "1px solid var(--border-color)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.12)" : "none",
        }}
        aria-hidden={!open}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="text-sm font-semibold leading-none" style={{ color: "var(--text-base)" }}>
              <span className="text-green-700 font-bold text-base">Invozen</span>
              <span className="text-zinc-400 font-medium"> GST</span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col px-3 py-4 flex-1" role="navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium hover:bg-green-50 hover:text-green-700 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              {link.label}
              <ChevronRight />
            </a>
          ))}

          <div className="mt-2 pt-4" style={{ borderTop: "1px solid var(--border-color)" }}>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-3 rounded-lg text-sm font-medium hover:bg-zinc-100 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              Log in
            </Link>
          </div>
        </nav>

        {/* Drawer CTA */}
        <div className="px-5 pb-8 pt-4" style={{ borderTop: "1px solid var(--border-color)" }}>
          <Link
            href="/signup"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 w-full bg-green-600 text-white text-sm font-semibold py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Start Free Trial
            <ArrowRightIcon size={15} strokeWidth={2.5} />
          </Link>
          <p className="text-center text-xs mt-2.5" style={{ color: "var(--text-faint)" }}>
            No credit card required
          </p>
        </div>
      </div>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
