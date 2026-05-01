"use client";

import { useState } from "react";
import AnimatedSection from "@/app/components/ui/AnimatedSection";
import { ShoppingBagIcon, BriefcaseIcon, TruckIcon, WrenchIcon, UsersIcon, CoffeeIcon, CheckIcon } from "@/app/components/ui/Icons";

const segments = [
  {
    id: "retail", label: "Retail", icon: <ShoppingBagIcon size={15} />,
    headline: "Bill faster. Keep records cleaner.",
    pain: "Creating invoices by hand or in Excel takes time you don't have — especially during busy hours.",
    solution: "Generate GST bills in 30 seconds with saved item lists. Track daily sales and GST liability automatically.",
    features: ["One-tap billing with saved SKUs", "Daily / weekly sales summary", "Auto CGST + SGST calculation", "End-of-day PDF report"],
    quote: "I used to write bills by hand. Now I send professional GST invoices from my phone in under a minute.",
    by: "Sanjay, Electronics Shop — Pune",
  },
  {
    id: "freelancer", label: "Freelancers", icon: <BriefcaseIcon size={15} />,
    headline: "Professional invoices. Compliant records.",
    pain: "Clients expect professional GST invoices. Calculating 18% for every project by hand is tedious and error-prone.",
    solution: "Enter your rate. Invozen applies GST, generates a client-ready PDF, and tracks what's paid.",
    features: ["Project-based invoicing", "Client GSTIN auto-validation", "IGST for cross-state clients", "Income and GST summary"],
    quote: "My CA is much happier now. I send her one clean GSTR-1 export instead of a mess of WhatsApp screenshots.",
    by: "Priya, UI/UX Freelancer — Bangalore",
  },
  {
    id: "distributor", label: "Distributors", icon: <TruckIcon size={15} />,
    headline: "High volume. Zero calculation errors.",
    pain: "Distributing across multiple states means managing IGST, CGST, SGST across hundreds of invoices.",
    solution: "Invozen auto-applies the correct tax type based on buyer location. Bulk invoicing with customer-wise ledger.",
    features: ["Bulk invoice generation", "State-wise tax splitting", "Customer outstanding ledger", "Transport / e-way bill notes"],
    quote: "We raise 80+ invoices a day. Invozen handles the GST math perfectly — no errors, no corrections needed.",
    by: "Rakesh, FMCG Distributor — Delhi NCR",
  },
  {
    id: "service", label: "Service Biz", icon: <WrenchIcon size={15} />,
    headline: "SAC codes, sorted. Invoices, done.",
    pain: "Service businesses struggle with SAC code classification and correct GST rates for their work.",
    solution: "Invozen has all SAC codes pre-loaded. Search your service, pick the code, correct GST applies.",
    features: ["SAC code library built-in", "Service-specific GST rates", "Advance receipt invoices", "Customer payment history"],
    quote: "I run an AC repair shop. I had no idea what SAC code to use. Invozen got it right from day one.",
    by: "Harish, AC Service Centre — Chennai",
  },
  {
    id: "accountant", label: "CAs / Accountants", icon: <UsersIcon size={15} />,
    headline: "All your small clients. One structured view.",
    pain: "Managing 20+ small clients means collecting invoices from WhatsApp, email, and notebooks.",
    solution: "Invite clients to Invozen. View their invoices, exports, and summaries — structured and filing-ready.",
    features: ["Multi-client dashboard", "One-click GSTR export per client", "Review and comment on invoices", "Role-based access control"],
    quote: "Invozen cut my pre-filing prep time from 3 days to a few hours. Clean exports every time.",
    by: "CA Meena Shah — Mumbai",
  },
  {
    id: "restaurant", label: "Restaurants", icon: <CoffeeIcon size={15} />,
    headline: "GST-ready bills for every table.",
    pain: "Restaurant GST has two rates — 5% or 18%. Getting this wrong causes filing mismatches.",
    solution: "Invozen supports both restaurant GST rates with separate billing for dine-in, takeaway, and delivery.",
    features: ["Dual GST rate support (5%/18%)", "Table / cover billing", "Delivery and takeaway invoices", "Monthly revenue reconciliation"],
    quote: "Our Zomato orders and dine-in bills are all tracked in one place. GST filing is no longer a headache.",
    by: "Anita, Restaurant Owner — Hyderabad",
  },
];

export default function IndustryUseCases() {
  const [active, setActive] = useState("retail");
  const cur = segments.find((s) => s.id === active)!;

  return (
    <section id="use-cases" className="py-20 md:py-28 relative overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="absolute inset-0 bg-dots opacity-25 pointer-events-none" aria-hidden="true" />
      <div className="container-page relative">
        <AnimatedSection className="max-w-2xl mb-12">
          <div className="section-chip mb-4">Who It&apos;s For</div>
          <h2 className="text-section mb-4" style={{ color: "var(--text)" }}>
            Built for every kind of{" "}
            <span className="font-display italic grad-text">Indian small business</span>
          </h2>
          <p className="text-[1.0625rem]" style={{ color: "var(--text-muted)" }}>
            Whether you sell goods, provide services, distribute across states, or manage clients as a CA — Invozen fits.
          </p>
        </AnimatedSection>

        {/* Tabs */}
        <AnimatedSection delay={1}>
          <div className="flex flex-wrap gap-2 mb-8" role="tablist">
            {segments.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={active === s.id}
                onClick={() => setActive(s.id)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all"
                style={{
                  background: active === s.id ? "#0d9488" : "var(--surface)",
                  color: active === s.id ? "#fff" : "var(--text-muted)",
                  border: `1px solid ${active === s.id ? "#0d9488" : "var(--border)"}`,
                  boxShadow: active === s.id ? "var(--shadow-brand)" : "none",
                }}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        </AnimatedSection>

        {/* Panel */}
        <AnimatedSection delay={2}>
          <div
            className="grid md:grid-cols-2 gap-6 p-6 md:p-8 rounded-3xl bg-white"
            style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}
          >
            <div className="flex flex-col gap-5">
              <h3 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>{cur.headline}</h3>
              <div className="p-4 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>The Problem</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{cur.pain}</p>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: "var(--bg-tinted)", border: "1px solid rgba(13,148,136,0.2)" }}>
                <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2 text-brand-700">How Invozen Helps</p>
                <p className="text-sm leading-relaxed text-brand-800">{cur.solution}</p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider mb-3" style={{ color: "var(--text-faint)" }}>Key capabilities</p>
                <ul className="flex flex-col gap-2.5">
                  {cur.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-2)" }}>
                      <CheckIcon size={14} strokeWidth={2.5} className="text-brand-600 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className="flex flex-col gap-3 p-4 rounded-2xl mt-auto"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm italic leading-relaxed" style={{ color: "var(--text-muted)" }}>&ldquo;{cur.quote}&rdquo;</p>
                <p className="text-xs font-bold" style={{ color: "var(--text-faint)" }}>— {cur.by}</p>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
