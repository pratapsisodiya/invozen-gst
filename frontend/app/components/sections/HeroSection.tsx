"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import AnimatedSection from "@/app/components/ui/AnimatedSection";
import { CheckIcon, ArrowRightIcon, WhatsAppIcon } from "@/app/components/ui/Icons";

const trustPills = [
  "Auto GST calculation",
  "GSTR-1/3B ready",
  "WhatsApp reminders",
  "Mobile-first",
];

const stats = [
  { value: "10,000+", label: "Businesses" },
  { value: "₹500 Cr+", label: "Invoiced" },
  { value: "4.9 ★", label: "Rating" },
];

export default function HeroSection() {
  const bgRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  /* ── Parallax: move background layer on scroll ── */
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (layerRef.current) {
            const y = window.scrollY * 0.32;
            layerRef.current.style.transform = `translateY(${y}px)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      ref={bgRef}
      id="hero"
      className="relative overflow-hidden bg-white"
      style={{ minHeight: "calc(100vh - 3.5rem)" }}
    >
      {/* ── Parallax background layer ── */}
      <div
        ref={layerRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ willChange: "transform" }}
      >
        {/* Mesh gradient blobs */}
        <div
          className="absolute -top-32 -left-32 w-[720px] h-[720px] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #0d9488 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/4 -right-40 w-[560px] h-[560px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #059669 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #0c7a71 0%, transparent 70%)" }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 bg-grid opacity-30"
        />
      </div>

      <div className="container-page relative pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-14 lg:gap-10 items-center">

          {/* ── Left: text ── */}
          <div className="flex flex-col gap-6 max-w-[540px]">
            {/* Eyebrow */}
            <AnimatedSection>
              <div className="section-chip">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-brand-600"
                  style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
                />
                GST-compliant invoicing · India
              </div>
            </AnimatedSection>

            {/* Headline */}
            <AnimatedSection delay={1}>
              <h1 className="text-hero" style={{ color: "var(--text)" }}>
                GST invoicing{" "}
                <span className="font-display italic grad-text">small businesses</span>
                <br />
                can actually use.
              </h1>
            </AnimatedSection>

            {/* Body */}
            <AnimatedSection delay={2}>
              <p className="text-[1.0625rem] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Create compliant invoices in under a minute. Auto-calculate CGST, SGST &amp; IGST.
                Export GSTR-1/3B data and collect faster with WhatsApp payment reminders.
              </p>
            </AnimatedSection>

            {/* Trust pills */}
            <AnimatedSection delay={2}>
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {trustPills.map((p) => (
                  <li key={p} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#0c7a71" }}>
                    <CheckIcon size={14} strokeWidth={2.5} className="text-brand-600 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </AnimatedSection>

            {/* CTAs */}
            <AnimatedSection delay={3}>
              <div className="flex flex-wrap gap-3 items-center">
                <Link
                  href="/signup"
                  className="btn-glow inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 text-white text-sm font-bold"
                  style={{ boxShadow: "0 2px 8px rgba(13,148,136,0.3)" }}
                >
                  Start Free Trial
                  <ArrowRightIcon size={16} strokeWidth={2.5} />
                </Link>
                <a
                  href="#demo"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border transition-all hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                >
                  See a demo →
                </a>
              </div>
              <p className="mt-3 text-xs" style={{ color: "var(--text-faint)" }}>
                No credit card required · Free 14-day trial · Setup in 5 minutes
              </p>
            </AnimatedSection>

            {/* Stats */}
            <AnimatedSection delay={4}>
              <div
                className="flex items-center gap-0 mt-1 rounded-2xl overflow-hidden border divide-x"
                style={{ borderColor: "var(--border)" }}
              >
                {stats.map((s) => (
                  <div key={s.label} className="flex flex-col items-center py-3 flex-1 gap-0.5" style={{ borderColor: "var(--border)" }}>
                    <span className="text-xl font-extrabold leading-none" style={{ color: "#0d9488" }}>{s.value}</span>
                    <span className="text-[11px] font-medium" style={{ color: "var(--text-faint)" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>

          {/* ── Right: 3D floating app mockup ── */}
          <AnimatedSection delay={2} variant="scale" className="w-full">
            <div
              className="relative w-full max-w-xl mx-auto lg:mx-0"
              style={{
                perspective: "1100px",
                perspectiveOrigin: "50% 40%",
              }}
            >
              {/* Floating glow behind card */}
              <div
                className="absolute inset-8 rounded-3xl pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse, rgba(13,148,136,0.18) 0%, transparent 70%)",
                  filter: "blur(20px)",
                  zIndex: 0,
                }}
                aria-hidden="true"
              />

              {/* Main mockup — 3D rotated */}
              <div
                className="mockup-window relative float-card-slow"
                style={{
                  transform: "perspective(1100px) rotateY(-5deg) rotateX(3deg)",
                  transformStyle: "preserve-3d",
                  zIndex: 1,
                }}
              >
                {/* Title bar */}
                <div className="mockup-titlebar">
                  <span className="mockup-dot bg-red-400" />
                  <span className="mockup-dot bg-amber-400" />
                  <span className="mockup-dot bg-green-400" />
                  <span className="ml-3 text-[10px] flex-1 text-center font-medium" style={{ color: "var(--text-faint)" }}>
                    Invozen GST — New Invoice
                  </span>
                </div>

                {/* App body */}
                <div className="flex" style={{ minHeight: 300 }}>
                  {/* Sidebar */}
                  <div className="mockup-sidebar w-32 shrink-0 hidden sm:block">
                    <div className="px-3 pt-3 pb-2">
                      <span className="mockup-label opacity-50">Menu</span>
                    </div>
                    {[
                      { icon: "⊞", label: "Dashboard", active: false },
                      { icon: "◨", label: "Invoices", active: true },
                      { icon: "◈", label: "GST Filing", active: false },
                      { icon: "◉", label: "Reports", active: false },
                      { icon: "⚙", label: "Settings", active: false },
                    ].map((item) => (
                      <div key={item.label} className={`mockup-nav-item ${item.active ? "active" : ""}`}>
                        <span className="text-[11px] opacity-50">{item.icon}</span>
                        {item.label}
                      </div>
                    ))}
                  </div>

                  {/* Main panel */}
                  <div className="flex-1 p-4 bg-white overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[13px] font-bold text-ink-800">New Invoice</p>
                      <span className="mockup-chip bg-brand-50 text-brand-700">Draft</span>
                    </div>

                    {/* Bill to */}
                    <div className="mb-3">
                      <p className="mockup-label mb-1">Bill To</p>
                      <div className="mockup-input">Raj Traders — 27AABCR1234N1Z5</div>
                    </div>

                    {/* Line items */}
                    <div className="mb-3">
                      <p className="mockup-label mb-1">Items</p>
                      <div className="rounded-lg overflow-hidden border border-ink-200">
                        <div className="grid grid-cols-4 px-2.5 py-1.5 text-[9px] font-semibold bg-ink-50 text-ink-400">
                          <span className="col-span-2">Description</span>
                          <span className="text-right">Rate</span>
                          <span className="text-right">Amount</span>
                        </div>
                        {[
                          { d: "Web Design", r: "₹10,000", a: "₹10,000" },
                          { d: "Domain", r: "₹1,200", a: "₹1,200" },
                        ].map((row, i) => (
                          <div key={i} className="grid grid-cols-4 px-2.5 py-1.5 text-[10px] border-t border-ink-100 text-ink-700">
                            <span className="col-span-2 truncate">{row.d}</span>
                            <span className="text-right text-ink-400">{row.r}</span>
                            <span className="text-right font-semibold">{row.a}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* GST breakdown */}
                    <div className="rounded-lg p-2.5 mb-3 bg-brand-50 border border-brand-100">
                      <p className="mockup-label mb-2 text-brand-700">Auto GST — 18%</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          { l: "Taxable", v: "₹11,200" },
                          { l: "CGST 9%", v: "₹1,008" },
                          { l: "SGST 9%", v: "₹1,008" },
                        ].map((c) => (
                          <div key={c.l}>
                            <p className="text-[9px] text-brand-600 opacity-70">{c.l}</p>
                            <p className="text-[11px] font-bold text-brand-700">{c.v}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total + CTA */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-medium text-ink-400 mb-0.5">Total</p>
                        <p className="text-base font-extrabold text-brand-600">₹13,216</p>
                      </div>
                      <button type="button" className="px-3 py-1.5 bg-brand-600 text-white text-[11px] font-bold rounded-lg">
                        Send Invoice →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Floating badge: WA reminder ── */}
              <div
                className="absolute -bottom-4 -left-4 md:-left-8 z-10 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border shadow-lg text-xs font-medium float-card"
                style={{ borderColor: "var(--border)", boxShadow: var_shadow_md, animationDelay: "0.8s" }}
              >
                <WhatsAppIcon size={16} className="text-green-600 shrink-0" />
                <span className="text-ink-600">
                  <span className="font-bold text-ink-800">Paid ₹13,216</span>
                  {" "}— reminder sent ✓
                </span>
                <span className="mockup-chip bg-ok-50 text-ok-600 ml-1">Delivered</span>
              </div>

              {/* ── Floating badge: GST status ── */}
              <div
                className="absolute -top-5 -right-4 md:-right-6 z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-white border shadow-md text-[11px] font-semibold float-card"
                style={{ borderColor: "var(--border)", animationDelay: "1.2s", animationDuration: "6s" }}
              >
                <span className="text-base">✅</span>
                <span className="text-ink-700">GSTR-1 Ready</span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

// CSS var shorthand for inline styles
const var_shadow_md = "0 4px 12px -2px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)";
