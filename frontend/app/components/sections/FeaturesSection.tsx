import AnimatedSection from "@/app/components/ui/AnimatedSection";
import {
  ZapIcon, CalculatorIcon, ReportIcon, BarChartIcon,
  WhatsAppIcon, SmartphoneIcon, UsersIcon, DownloadIcon,
  ShieldIcon, CheckIcon,
} from "@/app/components/ui/Icons";

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-20 md:py-28 relative overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* Background stripes */}
      <div className="absolute inset-0 bg-stripes pointer-events-none opacity-60" aria-hidden="true" />

      <div className="container-page relative">
        {/* Header */}
        <AnimatedSection className="max-w-2xl mb-16">
          <div className="section-chip mb-4">Features</div>
          <h2 className="text-section mb-4" style={{ color: "var(--text)" }}>
            Everything GST.{" "}
            <span className="font-display italic grad-text">Nothing unnecessary.</span>
          </h2>
          <p className="text-[1.0625rem]" style={{ color: "var(--text-muted)" }}>
            Invozen handles exactly what GST-registered Indian businesses need — without the enterprise bloat.
          </p>
        </AnimatedSection>

        {/* Asymmetric grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* ── BIG CARD: Auto GST ── */}
          <AnimatedSection delay={1} variant="left" className="lg:col-span-2">
            <div
              className="card-3d card-shine flex flex-col md:flex-row gap-6 p-7 rounded-3xl h-full bg-white"
              style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}
            >
              <div className="flex flex-col justify-between gap-5 flex-1">
                <div>
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "linear-gradient(135deg, #0d9488, #059669)" }}
                  >
                    <CalculatorIcon size={20} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>
                    Auto GST Calculation — Every Single Time
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    Set the GST rate once per item. Invozen automatically splits CGST + SGST for intra-state, or IGST for inter-state — from the buyer&apos;s GSTIN. Zero manual input.
                  </p>
                </div>
                <ul className="flex flex-col gap-2">
                  {["CGST + SGST for intra-state sales", "IGST for inter-state supply", "Composition scheme support", "HSN / SAC code matching"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--text-2)" }}>
                      <CheckIcon size={13} strokeWidth={2.5} className="text-brand-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Mini calc mockup */}
              <div
                className="w-full md:w-52 shrink-0 rounded-2xl p-4 flex flex-col gap-1.5"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-2">Live Calculation</p>
                {[
                  { l: "Item Total", v: "₹50,000", bold: false },
                  { l: "CGST 9%", v: "+ ₹4,500", bold: false },
                  { l: "SGST 9%", v: "+ ₹4,500", bold: false },
                  { l: "Total Invoice", v: "₹59,000", bold: true },
                ].map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between py-1.5 text-[11px] ${i === 3 ? "border-t font-extrabold text-brand-600 mt-1" : ""}`}
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span style={{ color: r.bold ? "#0d9488" : "var(--text-muted)" }}>{r.l}</span>
                    <span style={{ color: r.bold ? "#0d9488" : "var(--text)" }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* GSTR-1/3B */}
          <AnimatedSection delay={2} variant="right">
            <div
              className="card-lift card-shine flex flex-col gap-4 p-6 rounded-3xl h-full bg-white"
              style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(13,148,136,0.1)" }}
              >
                <ReportIcon size={20} className="text-brand-600" />
              </div>
              <div>
                <h3 className="text-card-title mb-2" style={{ color: "var(--text)" }}>
                  GSTR-1 / 3B Ready
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  All sales auto-organised by period. Export a clean summary — file yourself or hand it to your CA.
                </p>
              </div>
              <div className="mt-auto flex gap-2 flex-wrap">
                <span className="mockup-chip bg-ok-50 text-ok-600 py-1 text-[10px]">GSTR-1 ✓</span>
                <span className="mockup-chip bg-brand-50 text-brand-700 py-1 text-[10px]">GSTR-3B ✓</span>
                <span className="mockup-chip bg-warn-50 text-warn-600 py-1 text-[10px]">E-invoice</span>
              </div>
            </div>
          </AnimatedSection>

          {/* WhatsApp */}
          <AnimatedSection delay={1} variant="up">
            <div
              className="card-lift card-shine flex flex-col gap-4 p-6 rounded-3xl h-full"
              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
            >
              <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                <WhatsAppIcon size={22} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-card-title mb-2" style={{ color: "var(--text)" }}>
                  WhatsApp Reminders
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Automated, polite reminders via WhatsApp. Razorpay payment link included in every message.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Fast Invoice */}
          <AnimatedSection delay={2} variant="up">
            <div
              className="card-lift card-shine flex flex-col gap-4 p-6 rounded-3xl h-full bg-white"
              style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.12)" }}
              >
                <ZapIcon size={20} className="text-accent-600" />
              </div>
              <div>
                <h3 className="text-card-title mb-2" style={{ color: "var(--text)" }}>
                  Invoice in Under 60 Seconds
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Saved customers, items, and tax rates. Create and send a professional PDF invoice in one fast flow.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Mobile */}
          <AnimatedSection delay={3} variant="up">
            <div
              className="card-lift card-shine flex flex-col gap-4 p-6 rounded-3xl h-full"
              style={{ background: "var(--bg-tinted)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(13,148,136,0.12)" }}
              >
                <SmartphoneIcon size={20} className="text-brand-600" />
              </div>
              <div>
                <h3 className="text-card-title mb-2" style={{ color: "var(--text)" }}>
                  Beautiful on Any Phone
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Designed for phones from day one. Create invoices, check dues, and send reminders from your pocket.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Accountant + Analytics — wide row */}
          <AnimatedSection delay={1} variant="scale" className="md:col-span-2">
            <div className="grid sm:grid-cols-2 gap-4 h-full">
              {[
                {
                  icon: <UsersIcon size={20} className="text-brand-600" />,
                  bg: "rgba(13,148,136,0.1)",
                  title: "Accountant Collaboration",
                  desc: "Add your CA as a viewer. They get clean exports and a reconciliation panel — no more back-and-forth over WhatsApp.",
                },
                {
                  icon: <BarChartIcon size={20} className="text-accent-600" />,
                  bg: "rgba(245,158,11,0.1)",
                  title: "Real Business Analytics",
                  desc: "Revenue trends, outstanding receivables, and GST liability — in one dashboard without a separate analytics tool.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="card-lift card-shine flex flex-col gap-4 p-6 rounded-3xl bg-white"
                  style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: f.bg }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-card-title mb-2" style={{ color: "var(--text)" }}>{f.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          {/* Security + Export stack */}
          <AnimatedSection delay={2} variant="right">
            <div className="flex flex-col gap-4 h-full">
              {[
                { icon: <ShieldIcon size={15} className="text-brand-600" />, title: "Bank-grade Security", desc: "SSL encrypted, daily backups, Indian data centres." },
                { icon: <DownloadIcon size={15} className="text-brand-600" />, title: "One-click Export", desc: "Excel, CSV, or PDF in seconds." },
              ].map((f) => (
                <div
                  key={f.title}
                  className="card-lift flex flex-col gap-3 p-5 rounded-2xl flex-1 bg-white"
                  style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)" }}
                >
                  <div className="flex items-center gap-2">
                    {f.icon}
                    <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{f.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
