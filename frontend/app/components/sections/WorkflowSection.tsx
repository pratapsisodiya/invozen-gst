import AnimatedSection from "@/app/components/ui/AnimatedSection";
import { FileTextIcon, CalculatorIcon, SmartphoneIcon, ReportIcon, CheckCircleIcon } from "@/app/components/ui/Icons";

const steps = [
  {
    num: "01",
    icon: <FileTextIcon size={22} className="text-brand-600" />,
    title: "Add your business",
    desc: "Enter GSTIN. Invozen validates your registration instantly and pre-fills your business details.",
    badge: "2 min",
    bg: "rgba(13,148,136,0.08)",
  },
  {
    num: "02",
    icon: <CalculatorIcon size={22} className="text-brand-600" />,
    title: "Create an invoice",
    desc: "Pick a customer, add items — GST is calculated and split automatically. No manual math.",
    badge: "60 sec",
    bg: "rgba(13,148,136,0.08)",
  },
  {
    num: "03",
    icon: <SmartphoneIcon size={22} className="text-brand-600" />,
    title: "Send & collect",
    desc: "Share via WhatsApp with a Razorpay payment link embedded. One tap, payment done.",
    badge: "Instant",
    bg: "rgba(5,150,105,0.08)",
  },
  {
    num: "04",
    icon: <ReportIcon size={22} className="text-brand-600" />,
    title: "Export for filing",
    desc: "GSTR-1/3B summaries are always ready. Export one CSV and hand it to your CA.",
    badge: "Quarterly",
    bg: "rgba(13,148,136,0.08)",
  },
  {
    num: "05",
    icon: <CheckCircleIcon size={22} className="text-brand-600" />,
    title: "CA stays happy",
    desc: "Structured exports, clean records, no more last-minute scramble before filing.",
    badge: "Always ready",
    bg: "rgba(13,148,136,0.08)",
  },
];

export default function WorkflowSection() {
  return (
    <section
      id="workflow"
      className="py-20 md:py-28 relative overflow-hidden"
      style={{ background: "var(--bg-warm)" }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-25 pointer-events-none" aria-hidden="true" />

      <div className="container-page relative">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
          <div className="section-chip mb-4 mx-auto">How It Works</div>
          <h2 className="text-section mb-4" style={{ color: "var(--text)" }}>
            Set up once.{" "}
            <span className="font-display italic grad-text">Run forever.</span>
          </h2>
          <p className="text-[1.0625rem]" style={{ color: "var(--text-muted)" }}>
            From onboarding to your first GSTR-1 export — here&apos;s how little effort this actually requires.
          </p>
        </AnimatedSection>

        {/* Desktop: horizontal */}
        <div className="hidden lg:flex items-start gap-0 relative">
          {/* Connecting track */}
          <div
            className="absolute top-7 left-16 right-16 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, var(--border), var(--border), transparent)" }}
            aria-hidden="true"
          />

          {steps.map((step, i) => (
            <AnimatedSection
              key={step.num}
              delay={((i + 1) % 5) as 0 | 1 | 2 | 3 | 4 | 5}
              variant="up"
              className="flex-1 flex flex-col items-center text-center px-3"
            >
              {/* Step circle */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center relative z-10 mb-5 shadow-md"
                style={{
                  background: step.bg,
                  border: "2px solid rgba(13,148,136,0.25)",
                  boxShadow: "0 0 0 4px white, var(--shadow-md)",
                }}
              >
                {step.icon}
              </div>

              <span className="text-[10px] font-bold text-brand-500 tracking-[0.12em] uppercase mb-1">
                {step.num}
              </span>
              <h3 className="text-sm font-bold mb-1.5" style={{ color: "var(--text)" }}>
                {step.title}
              </h3>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
                {step.desc}
              </p>
              <span
                className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: "rgba(13,148,136,0.1)", color: "#0c7a71" }}
              >
                {step.badge}
              </span>
            </AnimatedSection>
          ))}
        </div>

        {/* Mobile: vertical */}
        <div className="lg:hidden flex flex-col gap-0">
          {steps.map((step, i) => (
            <AnimatedSection key={step.num} delay={((i + 1) % 5) as 0 | 1 | 2 | 3 | 4 | 5} variant="left">
              <div className="flex gap-5 pb-8 relative">
                {i < steps.length - 1 && (
                  <div
                    className="absolute left-6 top-14 bottom-0 w-px"
                    style={{ background: "var(--border)" }}
                    aria-hidden="true"
                  />
                )}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative z-10 shadow-sm"
                  style={{
                    background: step.bg,
                    border: "2px solid rgba(13,148,136,0.2)",
                    boxShadow: "0 0 0 3px white, var(--shadow-sm)",
                  }}
                >
                  {step.icon}
                </div>
                <div className="flex flex-col gap-1 pt-2">
                  <span className="text-[10px] font-bold text-brand-500 tracking-widest">{step.num}</span>
                  <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>{step.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{step.desc}</p>
                  <span
                    className="inline-block w-fit px-2.5 py-1 rounded-full text-[10px] font-bold mt-1"
                    style={{ background: "rgba(13,148,136,0.1)", color: "#0c7a71" }}
                  >
                    {step.badge}
                  </span>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* CTA */}
        <AnimatedSection className="mt-12 text-center">
          <a
            href="#pricing"
            className="btn-glow inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white text-sm font-bold rounded-xl"
            style={{ boxShadow: "var(--shadow-brand)" }}
          >
            Get started in minutes →
          </a>
          <p className="mt-3 text-xs" style={{ color: "var(--text-faint)" }}>
            No accounting background needed
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
