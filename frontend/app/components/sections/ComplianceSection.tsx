import AnimatedSection from "@/app/components/ui/AnimatedSection";
import { ShieldIcon, LockIcon, CloudIcon, CheckCircleIcon, RefreshIcon, FileTextIcon } from "@/app/components/ui/Icons";

const badges = [
  { icon: <ShieldIcon size={20} className="text-brand-600" />, bg: "rgba(13,148,136,0.1)", title: "GSTN Registered", desc: "Invozen is registered with GSTN for GSTIN validation and e-invoice workflows." },
  { icon: <LockIcon size={20} className="text-brand-600" />, bg: "rgba(13,148,136,0.1)", title: "SSL / TLS Encrypted", desc: "All data in transit is encrypted with TLS 1.3. Your invoices never travel unprotected." },
  { icon: <CloudIcon size={20} className="text-brand-600" />, bg: "rgba(13,148,136,0.1)", title: "Hosted in India", desc: "Business data stored in Indian data centres — DPDPA 2023 compliant." },
  { icon: <CheckCircleIcon size={20} className="text-ok-600" />, bg: "rgba(22,163,74,0.1)", title: "Daily Backups", desc: "Automated daily backups with 30-day retention. Your records are always recoverable." },
  { icon: <RefreshIcon size={20} className="text-brand-600" />, bg: "rgba(13,148,136,0.1)", title: "99.9% Uptime SLA", desc: "Designed for reliability. Bill without interruption — always." },
  { icon: <FileTextIcon size={20} className="text-accent-600" />, bg: "rgba(245,158,11,0.1)", title: "Full Audit Trail", desc: "Every invoice action logged with timestamp and user identity — reconciliation ready." },
];

export default function ComplianceSection() {
  return (
    <section
      id="compliance"
      className="py-20 md:py-28 relative overflow-hidden"
      style={{ background: "var(--ink-900, #151b26)" }}
    >
      {/* Dot bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden="true"
      />
      {/* Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(13,148,136,0.12) 0%, transparent 70%)", filter: "blur(40px)" }}
        aria-hidden="true"
      />

      <div className="container-page relative">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-14">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
            style={{ background: "rgba(13,148,136,0.15)", color: "#34d399", border: "1px solid rgba(13,148,136,0.2)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            Security & Reliability
          </div>
          <h2 className="text-section mb-4 text-white">
            Your data is safe.{" "}
            <span className="font-display italic" style={{ color: "#34d399" }}>Your records are always right.</span>
          </h2>
          <p className="text-base" style={{ color: "rgba(255,255,255,0.5)" }}>
            Invozen is built with the same seriousness around data security you expect from a financial product.
          </p>
        </AnimatedSection>

        {/* Badge grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {badges.map((badge, i) => (
            <AnimatedSection key={badge.title} delay={((i % 4) + 1) as 1 | 2 | 3 | 4} variant="scale">
              <div
                className="card-lift flex flex-col gap-4 p-6 rounded-2xl h-full"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: badge.bg }}>
                  {badge.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1.5">{badge.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{badge.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Data commitment */}
        <AnimatedSection>
          <div
            className="flex flex-col sm:flex-row gap-5 items-start sm:items-center p-6 rounded-2xl"
            style={{ background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)" }}
          >
            <ShieldIcon size={20} className="text-brand-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-white mb-1">Our data commitment</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                We never sell your data. We never share customer lists. Your records belong to you — always exportable, always deletable.
              </p>
            </div>
            <a
              href="#"
              className="shrink-0 px-4 py-2 text-xs font-bold text-brand-400 rounded-lg hover:bg-brand-900/30 transition-colors whitespace-nowrap"
              style={{ border: "1px solid rgba(13,148,136,0.3)" }}
            >
              Privacy Policy →
            </a>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
