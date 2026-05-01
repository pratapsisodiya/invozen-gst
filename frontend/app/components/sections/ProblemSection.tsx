import AnimatedSection from "@/app/components/ui/AnimatedSection";

const pains = [
  {
    num: "01",
    emoji: "📋",
    title: "Tally feels like piloting a plane",
    desc: "Legacy accounting software was built for CAs, not for a shop owner billing 10 customers a day.",
    color: "#fef3c7",
    accent: "#d97706",
  },
  {
    num: "02",
    emoji: "🔢",
    title: "Manual GST math leads to costly errors",
    desc: "Calculating CGST, SGST, IGST and HSN codes by hand means one typo can misfire your returns.",
    color: "#fee2e2",
    accent: "#dc2626",
  },
  {
    num: "03",
    emoji: "📂",
    title: "Records scattered across three places",
    desc: "Invoices in WhatsApp. Expenses in a notebook. Tax data with accountant. Nothing is structured at filing time.",
    color: "#fce7f3",
    accent: "#db2777",
  },
  {
    num: "04",
    emoji: "📵",
    title: "Payment follow-ups feel awkward",
    desc: "You send one reminder, then hesitate to ask again. Dues pile up. Relationships get uncomfortable.",
    color: "#ede9fe",
    accent: "#7c3aed",
  },
  {
    num: "05",
    emoji: "🗓️",
    title: "Filing season is always a fire drill",
    desc: "Every quarter you scramble to compile data. Half the time returns get filed late with penalties.",
    color: "#fee2e2",
    accent: "#dc2626",
  },
  {
    num: "06",
    emoji: "📱",
    title: "Your billing tool barely works on mobile",
    desc: "You run your business from your phone, but your app barely loads. You're forced onto a desktop you rarely use.",
    color: "#fef3c7",
    accent: "#d97706",
  },
];

export default function ProblemSection() {
  return (
    <section
      id="problem"
      className="py-20 md:py-28 relative overflow-hidden"
      style={{ background: "var(--bg-warm)" }}
    >
      {/* Background dots */}
      <div className="absolute inset-0 bg-dots opacity-40 pointer-events-none" aria-hidden="true" />

      <div className="container-page relative">
        {/* Header */}
        <AnimatedSection className="max-w-2xl mb-16">
          <div className="section-chip mb-4">The Problem</div>
          <h2 className="text-section mb-4" style={{ color: "var(--text)" }}>
            GST compliance shouldn&apos;t feel<br />
            <span className="font-display italic grad-text">like a second job</span>
          </h2>
          <p className="text-[1.0625rem] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            If you&apos;re a small business owner in India, you didn&apos;t start your business to become an accountant. But somewhere between invoices, returns, and follow-ups — it started feeling exactly like that.
          </p>
        </AnimatedSection>

        {/* Pain grid — staggered 3-col */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pains.map((pain, i) => (
            <AnimatedSection key={pain.num} delay={((i % 3) + 1) as 1 | 2 | 3} variant="up">
              <div
                className="card-lift card-shine flex flex-col gap-4 p-6 rounded-2xl h-full bg-white"
                style={{
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* Number + icon row */}
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: pain.color }}
                  >
                    {pain.emoji}
                  </div>
                  <span
                    className="text-3xl font-extrabold leading-none opacity-10 select-none"
                    style={{ color: pain.accent, fontVariantNumeric: "tabular-nums" }}
                  >
                    {pain.num}
                  </span>
                </div>
                <h3
                  className="text-card-title"
                  style={{ color: "var(--text)" }}
                >
                  {pain.title}
                </h3>
                <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--text-muted)" }}>
                  {pain.desc}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Pivot */}
        <AnimatedSection className="mt-20 text-center">
          <div className="inline-flex flex-col items-center gap-5">
            <div
              className="w-px h-12"
              style={{ background: "linear-gradient(to bottom, transparent, #0d9488, transparent)" }}
            />
            <div
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-brand-600 text-white"
              style={{ boxShadow: "var(--shadow-brand)" }}
            >
              <span className="text-lg font-extrabold tracking-tight">Until now.</span>
              <span className="text-brand-200 text-sm font-medium">Invozen handles all of this automatically.</span>
            </div>
            <a
              href="#demo"
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
            >
              See it in action →
            </a>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
