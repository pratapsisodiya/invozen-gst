import AnimatedSection from "@/app/components/ui/AnimatedSection";
import { UsersIcon, DownloadIcon, ShieldIcon } from "@/app/components/ui/Icons";

const collab = [
  {
    icon: <UsersIcon size={16} className="text-brand-600" />,
    bg: "rgba(13,148,136,0.1)",
    title: "Invite your CA as a viewer",
    desc: "Add your accountant with a restricted role. They see exactly what they need — no more, no less.",
  },
  {
    icon: <DownloadIcon size={16} className="text-brand-600" />,
    bg: "rgba(13,148,136,0.1)",
    title: "One-click GSTR export",
    desc: "CA gets a clean period-wise Excel/CSV export. No compiling needed before filing.",
  },
  {
    icon: <ShieldIcon size={16} className="text-brand-600" />,
    bg: "rgba(13,148,136,0.1)",
    title: "Full audit trail",
    desc: "Every invoice action is logged. Records are always reconciliation-ready.",
  },
];

const clients = [
  { name: "Raj Electronics", gstin: "27AABCR1234N1Z5", due: "₹41,300", status: "Filed ✓", ok: true },
  { name: "Priya Designs",   gstin: "29AABCP5678M1Z2", due: "₹0",      status: "Filed ✓", ok: true },
  { name: "Mehta Traders",   gstin: "07AABCM9876K1Z8", due: "₹28,000", status: "Pending", ok: false },
  { name: "Shine Services",  gstin: "33AABCS4321L1Z6", due: "₹15,500", status: "Filed ✓", ok: true },
];

export default function AccountantSection() {
  return (
    <section
      id="for-accountants"
      className="py-20 md:py-28 relative overflow-hidden"
      style={{ background: "var(--bg-tinted)" }}
    >
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" aria-hidden="true" />

      <div className="container-page relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left */}
          <div className="flex flex-col gap-7">
            <AnimatedSection variant="left">
              <div className="section-chip mb-4">For Accountants</div>
              <h2 className="text-section mb-4" style={{ color: "var(--text)" }}>
                Built for your CA too,{" "}
                <span className="font-display italic grad-text">not just you</span>
              </h2>
              <p className="text-[1.0625rem] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Your accountant doesn&apos;t need to learn new software. Invozen gives them clean structured exports and a read-only portal — your workflow stays intact.
              </p>
            </AnimatedSection>

            <div className="flex flex-col gap-4">
              {collab.map((c, i) => (
                <AnimatedSection key={c.title} delay={(i + 1) as 1 | 2 | 3} variant="left">
                  <div className="flex gap-3.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: c.bg }}
                    >
                      {c.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{c.title}</p>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{c.desc}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>

            <AnimatedSection delay={3} variant="left">
              <div
                className="flex flex-col gap-3 p-5 rounded-2xl bg-white"
                style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <p className="text-sm italic leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  &ldquo;I manage 40+ small business clients. Invozen cut my pre-filing prep from 3 days to half a day. Exports are clean and records are always up to date.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-extrabold">M</div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: "var(--text)" }}>CA Meena Shah</p>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>Chartered Accountant — Mumbai</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* Right: CA dashboard mockup */}
          <AnimatedSection delay={2} variant="right">
            <div className="mockup-window">
              <div className="mockup-titlebar">
                <span className="mockup-dot bg-red-400" />
                <span className="mockup-dot bg-amber-400" />
                <span className="mockup-dot bg-green-400" />
                <span className="ml-3 text-[10px]" style={{ color: "var(--text-faint)" }}>
                  Invozen GST — CA Dashboard
                </span>
              </div>
              <div className="p-5 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[13px] font-bold text-ink-800">My Clients</p>
                    <p className="text-[10px] text-ink-400">Filing period: Jan 2024</p>
                  </div>
                  <button type="button" className="px-3 py-1.5 text-[11px] font-bold bg-brand-600 text-white rounded-xl">
                    Export All →
                  </button>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[{ l: "Total Clients", v: "4" }, { l: "Filed", v: "3" }, { l: "Pending", v: "1" }].map((s) => (
                    <div key={s.l} className="text-center p-2 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <p className="text-sm font-extrabold text-brand-600">{s.v}</p>
                      <p className="text-[9px] text-ink-400">{s.l}</p>
                    </div>
                  ))}
                </div>
                {/* Table */}
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <div className="grid grid-cols-4 px-3 py-2 text-[9px] font-extrabold uppercase tracking-wider" style={{ background: "var(--surface)", color: "var(--text-faint)" }}>
                    <span>Business</span>
                    <span>GSTIN</span>
                    <span className="text-right">Due</span>
                    <span className="text-right">Status</span>
                  </div>
                  {clients.map((row, i) => (
                    <div key={i} className="grid grid-cols-4 px-3 py-2.5 text-[10px] items-center" style={{ borderTop: "1px solid var(--border)" }}>
                      <span className="font-semibold truncate" style={{ color: "var(--text)" }}>{row.name}</span>
                      <span className="font-mono text-[9px] text-ink-400">{row.gstin.slice(0, 9)}…</span>
                      <span className="text-right font-semibold" style={{ color: "var(--text)" }}>{row.due}</span>
                      <span className="text-right">
                        <span className={`mockup-chip text-[9px] ${row.ok ? "bg-ok-50 text-ok-600" : "bg-warn-50 text-warn-600"}`}>{row.status}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  {["GSTR-1 CSV", "Reconciliation"].map((btn) => (
                    <button key={btn} type="button" className="flex-1 py-2 text-[10px] font-semibold rounded-xl transition-colors hover:bg-brand-50 hover:text-brand-700" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
