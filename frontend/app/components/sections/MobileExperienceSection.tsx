import AnimatedSection from "@/app/components/ui/AnimatedSection";
import { CheckIcon, SmartphoneIcon, ZapIcon, CloudIcon, LockIcon } from "@/app/components/ui/Icons";

const features = [
  { icon: <ZapIcon size={15} className="text-brand-600" />, bg: "rgba(13,148,136,0.1)", title: "Create invoices from your pocket", desc: "Full invoice creation flow optimised for thumb reach. No scrolling or pinching." },
  { icon: <CloudIcon size={15} className="text-brand-600" />, bg: "rgba(13,148,136,0.1)", title: "Works offline, syncs later", desc: "No internet? Draft invoices offline and they sync automatically when back online." },
  { icon: <SmartphoneIcon size={15} className="text-brand-600" />, bg: "rgba(13,148,136,0.1)", title: "Share instantly via WhatsApp", desc: "Generate PDF and share directly to WhatsApp or email from the invoice screen." },
  { icon: <LockIcon size={15} className="text-brand-600" />, bg: "rgba(13,148,136,0.1)", title: "Biometric app lock", desc: "Fingerprint or face unlock. Bank-level security on your phone." },
];

export default function MobileExperienceSection() {
  return (
    <section
      id="mobile"
      className="py-20 md:py-28 relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, var(--bg-tinted) 0%, var(--bg) 100%)",
      }}
    >
      <div className="container-page">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: phone */}
          <AnimatedSection delay={1} variant="left" className="flex justify-center">
            <div className="relative">
              {/* Second phone ghost */}
              <div
                className="absolute -right-10 top-8 w-48 phone-shell opacity-30"
                style={{ height: 400, transform: "scale(0.85) rotate(8deg)", transformOrigin: "bottom left", zIndex: 0 }}
                aria-hidden="true"
              >
                <div className="phone-screen h-full" />
              </div>

              <div className="phone-shell w-60 relative z-10 float-card-slow" style={{ height: 480 }}>
                <div className="phone-notch" />
                <div className="phone-screen h-full flex flex-col bg-white">
                  <div className="flex items-center justify-between px-5 pt-9 pb-2">
                    <span className="text-[9px] font-bold text-ink-800">9:41</span>
                    <span className="text-[8px] font-semibold text-ink-400">100%</span>
                  </div>

                  <div className="px-4 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium text-ink-400">Good morning,</p>
                        <p className="text-sm font-extrabold text-ink-900">Raj Electronics</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-[11px] font-extrabold">R</div>
                    </div>
                  </div>

                  {/* Revenue card */}
                  <div className="mx-4 p-3 rounded-2xl mb-3" style={{ background: "var(--bg-tinted)", border: "1px solid rgba(13,148,136,0.15)" }}>
                    <p className="text-[9px] text-brand-600 font-semibold">This Month</p>
                    <p className="text-xl font-extrabold text-brand-700 leading-tight">₹2,34,500</p>
                    <p className="text-[9px] text-green-600 font-bold mt-0.5">↑ +12% vs last month</p>
                    <div className="flex items-end gap-0.5 mt-2 h-6">
                      {[40,60,45,80,65,90,75,100,85,70].map((h,i) => (
                        <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i===9 ? "#0d9488" : "rgba(13,148,136,0.15)" }} />
                      ))}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-3 gap-2 mx-4 mb-3">
                    {[{ l: "New Invoice", e: "+" }, { l: "Reminders", e: "🔔" }, { l: "GST Report", e: "📊" }].map((a) => (
                      <div key={a.l} className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div className="w-7 h-7 rounded-lg" style={{ background: "rgba(13,148,136,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.875rem" }}>{a.e}</div>
                        <span className="text-[8px] font-semibold text-center leading-tight text-ink-500">{a.l}</span>
                      </div>
                    ))}
                  </div>

                  {/* Invoice list */}
                  <div className="mx-4 flex-1">
                    <p className="text-[10px] font-bold text-ink-800 mb-2">Recent Invoices</p>
                    {[
                      { n: "Mehta Ent.", a: "₹41,300", s: "Paid", c: "text-green-600" },
                      { n: "Raj Traders", a: "₹28,000", s: "Due", c: "text-amber-600" },
                      { n: "Shine Svcs", a: "₹15,500", s: "Sent", c: "text-brand-600" },
                    ].map((inv, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-[8px] font-extrabold text-brand-700">{inv.n[0]}</div>
                          <span className="text-[10px] font-semibold text-ink-800">{inv.n}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-ink-800">{inv.a}</span>
                          <span className={`text-[8px] font-bold ${inv.c}`}>{inv.s}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* FAB */}
                  <div className="flex justify-center pb-5 pt-3">
                    <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center" style={{ boxShadow: "var(--shadow-brand)" }}>
                      <span className="text-white text-2xl font-thin leading-none">+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Right: text */}
          <div className="flex flex-col gap-6">
            <AnimatedSection variant="right">
              <div className="section-chip mb-3">Mobile First</div>
              <h2 className="text-section mb-4" style={{ color: "var(--text)" }}>
                Run your GST workflow{" "}
                <span className="font-display italic grad-text">from any phone</span>
              </h2>
              <p className="text-[1.0625rem] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Most Indian small business owners work primarily on their phones. Invozen is built for this reality — not just adapted for it. Every flow is thumb-friendly, fast, and designed for real field use.
              </p>
            </AnimatedSection>

            <div className="flex flex-col gap-4">
              {features.map((f, i) => (
                <AnimatedSection key={f.title} delay={(i + 1) as 1 | 2 | 3 | 4} variant="right">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: f.bg }}>{f.icon}</div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{f.title}</p>
                      <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>

            <AnimatedSection delay={4} variant="right">
              <div className="flex flex-wrap gap-2 mt-1">
                {["Android", "iOS", "Web (any browser)"].map((p) => (
                  <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(13,148,136,0.1)", color: "#0c7a71" }}>
                    <CheckIcon size={12} strokeWidth={2.5} />
                    {p}
                  </span>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
