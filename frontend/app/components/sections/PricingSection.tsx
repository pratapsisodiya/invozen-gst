"use client";

import Link from "next/link";
import { useState } from "react";
import AnimatedSection from "@/app/components/ui/AnimatedSection";
import { CheckIcon, ArrowRightIcon } from "@/app/components/ui/Icons";

const proFeatures = [
  "Unlimited GST invoices",
  "Auto CGST / SGST / IGST calculation",
  "GSTR-1 & GSTR-3B ready summaries",
  "WhatsApp payment reminders",
  "Razorpay payment link integration",
  "Customer & product ledger",
  "PDF invoice generation",
  "Accountant read-only access",
  "Mobile app (Android & iOS)",
  "Excel / CSV export for filing",
  "E-invoice workflow support",
  "Priority customer support",
];

const enterpriseFeatures = [
  "Everything in Pro",
  "Multiple GSTIN / branch support",
  "Unlimited team members",
  "Custom invoice branding",
  "Dedicated account manager",
  "API access",
  "Custom data retention policy",
  "SLA-backed uptime guarantee",
];

export default function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const monthly = 999;
  const annualMonthly = 799;

  return (
    <section
      id="pricing"
      className="py-20 md:py-28 relative overflow-hidden"
      style={{ background: "var(--bg-warm)" }}
    >
      {/* Background mesh */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(13,148,136,0.06) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      <div className="container-page relative">
        {/* Header */}
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-12">
          <div className="section-chip mb-4 mx-auto">Pricing</div>
          <h2 className="text-section mb-4" style={{ color: "var(--text)" }}>
            Less than your{" "}
            <span className="font-display italic grad-text">accountant&apos;s hourly rate</span>
          </h2>
          <p className="text-[1.0625rem]" style={{ color: "var(--text-muted)" }}>
            One plan for everything your GST-registered business needs. No per-invoice fees, no hidden charges.
          </p>
        </AnimatedSection>

        {/* Toggle */}
        <AnimatedSection delay={1}>
          <div className="flex justify-center items-center gap-3 mb-10">
            <span
              className="text-sm font-semibold"
              style={{ color: annual ? "var(--text-faint)" : "var(--text)" }}
            >
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={annual}
              onClick={() => setAnnual((v) => !v)}
              className="relative inline-flex w-11 h-6 rounded-full transition-colors cursor-pointer"
              style={{
                background: annual ? "#0d9488" : "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200"
                style={{ left: annual ? "calc(100% - 1.375rem)" : "0.125rem" }}
              />
            </button>
            <span
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: annual ? "var(--text)" : "var(--text-faint)" }}
            >
              Annual
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-all"
                style={{
                  background: annual ? "#0d9488" : "var(--surface-2)",
                  color: annual ? "#fff" : "var(--text-faint)",
                  opacity: annual ? 1 : 0.5,
                }}
              >
                Save 20%
              </span>
            </span>
          </div>
        </AnimatedSection>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">

          {/* Pro */}
          <AnimatedSection delay={1} variant="left">
            <div
              className="card-3d flex flex-col gap-6 p-7 rounded-3xl relative bg-white"
              style={{
                border: "2px solid #0d9488",
                boxShadow: "0 0 0 4px rgba(13,148,136,0.08), var(--shadow-lg)",
              }}
            >
              <div
                className="absolute -top-3.5 left-6 px-3.5 py-1 rounded-full text-xs font-extrabold text-white"
                style={{ background: "linear-gradient(90deg, #0d9488, #059669)" }}
              >
                Most Popular
              </div>

              <div>
                <p className="text-sm font-bold text-brand-600 mb-2">Invozen Pro</p>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-5xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
                    ₹{annual ? annualMonthly.toLocaleString("en-IN") : monthly.toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>/month</span>
                </div>
                {annual ? (
                  <p className="text-xs font-semibold text-brand-600">
                    ₹{(annualMonthly * 12).toLocaleString("en-IN")} billed annually · Save ₹2,400/yr
                  </p>
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    Billed monthly · Cancel anytime
                  </p>
                )}
              </div>

              <ul className="flex flex-col gap-2.5">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                    <CheckIcon size={14} strokeWidth={2.5} className="text-brand-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-3">
                <Link
                  href="/signup"
                  className="btn-glow flex items-center justify-center gap-2 w-full py-3.5 bg-brand-600 text-white text-sm font-extrabold rounded-2xl"
                  style={{ boxShadow: "var(--shadow-brand)" }}
                >
                  Start Free 14-Day Trial
                  <ArrowRightIcon size={16} strokeWidth={2.5} />
                </Link>
                <p className="text-center text-xs" style={{ color: "var(--text-faint)" }}>
                  No credit card required · Cancel anytime
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Enterprise */}
          <AnimatedSection delay={2} variant="right">
            <div
              className="card-lift flex flex-col gap-6 p-7 rounded-3xl bg-white h-full"
              style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
            >
              <div>
                <p className="text-sm font-bold mb-2" style={{ color: "var(--text)" }}>Enterprise</p>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-3xl font-extrabold" style={{ color: "var(--text)" }}>Custom</span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                  For distributors, CAs managing 20+ clients, or multi-branch businesses
                </p>
              </div>

              <ul className="flex flex-col gap-2.5">
                {enterpriseFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                    <CheckIcon size={14} strokeWidth={2.5} className="text-brand-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-3">
                <a
                  href="https://wa.me/919999999999?text=Hi, I want to discuss Invozen Enterprise"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-bold rounded-2xl transition-all hover:bg-brand-50 hover:border-brand-400 hover:text-brand-700"
                  style={{ border: "1.5px solid var(--border)", color: "var(--text-muted)" }}
                >
                  Contact Sales →
                </a>
                <p className="text-center text-xs" style={{ color: "var(--text-faint)" }}>
                  We respond within 24 hours
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>

        {/* Reassurance */}
        <AnimatedSection delay={2} className="mt-10">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              "No bloated accounting suite",
              "Setup in under 5 minutes",
              "Cancel anytime, no lock-in",
              "Built for small business budgets",
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                <CheckIcon size={13} strokeWidth={2.5} className="text-brand-500 shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
