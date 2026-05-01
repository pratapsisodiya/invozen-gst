import AnimatedSection from "@/app/components/ui/AnimatedSection";
import { CheckIcon, InfoIcon } from "@/app/components/ui/Icons";

const types = [
  {
    code: "CGST",
    name: "Central GST",
    when: "Both buyer and seller in the same state",
    example: "Maharashtra sale → CGST 9% = ₹900",
    bg: "#edfdf8",
    accent: "#0d9488",
    notes: ["Split equally with SGST", "Collected by Central Govt.", "Offset with CGST credit"],
  },
  {
    code: "SGST",
    name: "State / UT GST",
    when: "Collected alongside CGST for intra-state",
    example: "Same Maharashtra sale → SGST 9% = ₹900",
    bg: "#f0fdf4",
    accent: "#059669",
    notes: ["Matches CGST rate exactly", "Collected by State Govt.", "Offset with SGST credit"],
  },
  {
    code: "IGST",
    name: "Integrated GST",
    when: "Buyer in a different state (inter-state)",
    example: "Maharashtra → Gujarat → IGST 18% = ₹1,800",
    bg: "#fffbeb",
    accent: "#d97706",
    notes: ["Replaces CGST + SGST", "Single tax, easier filing", "Offset against all GST credits"],
  },
];

const hsn = [
  { code: "998313", desc: "IT / Software consulting", rate: "18%" },
  { code: "998431", desc: "Accounting & bookkeeping", rate: "18%" },
  { code: "6101",   desc: "Men's clothing (cotton)", rate: "5%" },
  { code: "8471",   desc: "Computers & laptops", rate: "18%" },
  { code: "0901",   desc: "Coffee & tea", rate: "5%" },
  { code: "4901",   desc: "Printed books", rate: "0%" },
];

export default function GSTDeepDive() {
  return (
    <section
      id="gst-guide"
      className="py-20 md:py-28 relative overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <div className="absolute inset-0 bg-dots opacity-30 pointer-events-none" aria-hidden="true" />

      <div className="container-page relative">
        <AnimatedSection className="max-w-2xl mb-14">
          <div className="section-chip mb-4">GST Automation</div>
          <h2 className="text-section mb-4" style={{ color: "var(--text)" }}>
            Invozen handles every{" "}
            <span className="font-display italic grad-text">GST scenario automatically</span>
          </h2>
          <p className="text-[1.0625rem]" style={{ color: "var(--text-muted)" }}>
            CGST, SGST, IGST — detected from the buyer&apos;s GSTIN, applied correctly, split perfectly. You never touch a calculator.
          </p>
        </AnimatedSection>

        {/* Three GST type cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {types.map((t, i) => (
            <AnimatedSection key={t.code} delay={(i + 1) as 1 | 2 | 3} variant="up">
              <div
                className="card-lift flex flex-col gap-4 p-6 rounded-3xl h-full"
                style={{ background: t.bg, border: `1px solid ${t.accent}20` }}
              >
                <div>
                  <span
                    className="inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold tracking-widest text-white mb-3"
                    style={{ background: t.accent }}
                  >
                    {t.code}
                  </span>
                  <p className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>{t.name}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{t.when}</p>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.6)", border: `1px solid ${t.accent}25` }}
                >
                  <p className="text-[9px] font-extrabold uppercase tracking-widest mb-1" style={{ color: t.accent }}>Example</p>
                  <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{t.example}</p>
                </div>
                <ul className="flex flex-col gap-1.5 mt-auto">
                  {t.notes.map((n) => (
                    <li key={n} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span style={{ color: t.accent }} className="shrink-0 inline-flex">
                        <CheckIcon size={12} strokeWidth={2.5} />
                      </span>
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* HSN codes */}
        <AnimatedSection variant="scale">
          <div
            className="rounded-3xl p-6 md:p-8 bg-white"
            style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}
          >
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <InfoIcon size={16} className="text-brand-600" />
                  <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>HSN / SAC Codes — pre-loaded</h3>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
                  Every product and service has an HSN or SAC code. Invozen has thousands pre-loaded — search, pick, and move on. The correct GST rate applies automatically.
                </p>
                <a href="#features" className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors">
                  See all supported codes →
                </a>
              </div>
              <div className="flex-1">
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <div className="grid grid-cols-3 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider" style={{ background: "var(--surface)", color: "var(--text-faint)" }}>
                    <span>Code</span>
                    <span>Description</span>
                    <span className="text-right">GST</span>
                  </div>
                  {hsn.map((h, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-3 px-4 py-2.5 text-[11px] items-center"
                      style={{ borderTop: "1px solid var(--border)", color: "var(--text)" }}
                    >
                      <span className="font-mono font-bold text-brand-600">{h.code}</span>
                      <span style={{ color: "var(--text-muted)" }}>{h.desc}</span>
                      <span className="text-right font-bold">{h.rate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* E-invoice callout */}
        <AnimatedSection delay={1} className="mt-5">
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl"
            style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-xl">🧾</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900 mb-1">E-invoicing workflow ready</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                For businesses above ₹5 Cr turnover, Invozen supports IRN generation and QR code embedding on invoices.
              </p>
            </div>
            <a
              href="#features"
              className="shrink-0 px-4 py-2 text-xs font-bold text-amber-700 rounded-xl hover:bg-amber-100 transition-colors"
              style={{ border: "1px solid #fcd34d" }}
            >
              Learn more →
            </a>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
