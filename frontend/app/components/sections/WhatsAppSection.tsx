import AnimatedSection from "@/app/components/ui/AnimatedSection";
import { CheckIcon, WhatsAppIcon, ClockIcon, BellIcon } from "@/app/components/ui/Icons";

const features = [
  { icon: <ClockIcon size={15} className="text-brand-600" />, bg: "rgba(13,148,136,0.1)", title: "Scheduled reminders", desc: "Set reminders for before due, on due date, and after overdue. Sent automatically." },
  { icon: <WhatsAppIcon size={15} className="text-green-600" />, bg: "rgba(22,163,74,0.1)", title: "WhatsApp delivery", desc: "Reminders go via WhatsApp — the channel your customers actually open and read." },
  { icon: <BellIcon size={15} className="text-brand-600" />, bg: "rgba(13,148,136,0.1)", title: "Payment link included", desc: "Every reminder includes a Razorpay UPI/card payment link. One tap, payment done." },
  { icon: <CheckIcon size={15} strokeWidth={2.5} className="text-brand-600" />, bg: "rgba(13,148,136,0.1)", title: "Auto-stops on payment", desc: "The moment payment is received, all pending reminders for that invoice cancel." },
];

export default function WhatsAppSection() {
  return (
    <section
      id="reminders"
      className="py-20 md:py-28 relative overflow-hidden"
      style={{ background: "var(--bg-warm)" }}
    >
      <div className="absolute inset-0 bg-stripes opacity-50 pointer-events-none" aria-hidden="true" />

      <div className="container-page relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: text */}
          <div className="flex flex-col gap-6 order-2 lg:order-1">
            <AnimatedSection variant="left">
              <div className="section-chip mb-3">Collections</div>
              <h2 className="text-section mb-4" style={{ color: "var(--text)" }}>
                Never chase a{" "}
                <span className="font-display italic grad-text">payment again</span>
              </h2>
              <p className="text-[1.0625rem] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Awkward follow-ups damage relationships. Invozen sends polite, professional WhatsApp reminders on your behalf — so you stay paid without the discomfort.
              </p>
            </AnimatedSection>

            <div className="flex flex-col gap-4">
              {features.map((f, i) => (
                <AnimatedSection key={f.title} delay={(i + 1) as 1 | 2 | 3 | 4} variant="left">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: f.bg }}>
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{f.title}</p>
                      <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>

            <AnimatedSection delay={4} variant="left">
              <div
                className="flex items-center gap-4 p-4 rounded-2xl bg-white"
                style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <span className="text-3xl font-extrabold text-brand-600">34%</span>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Average reduction in overdue invoices reported by users within the first month.
                </p>
              </div>
            </AnimatedSection>
          </div>

          {/* Right: phone */}
          <AnimatedSection delay={1} variant="right" className="order-1 lg:order-2 flex justify-center">
            <div className="relative">
              {/* Paid badge */}
              <div
                className="absolute -top-5 -right-4 md:-right-8 z-10 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white shadow-lg text-xs font-semibold float-card"
                style={{ border: "1px solid var(--border)", animationDelay: "0.5s" }}
              >
                <span className="w-2 h-2 rounded-full bg-green-500 animate-[pulse-dot_2s_ease-in-out_infinite]" />
                <span style={{ color: "var(--text)" }}>Paid ₹41,300 ✓</span>
              </div>

              <div className="phone-shell w-64 mx-auto" style={{ height: 490 }}>
                <div className="phone-notch" />
                <div className="phone-screen h-full flex flex-col">
                  {/* WA header */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5 pt-8" style={{ background: "#075e54" }}>
                    <div className="w-7 h-7 rounded-full bg-green-300 flex items-center justify-center text-[11px] font-extrabold text-green-900">IZ</div>
                    <div>
                      <p className="text-white text-xs font-bold leading-none">Invozen GST</p>
                      <p className="text-[9px] text-green-200 mt-0.5">Business Account</p>
                    </div>
                  </div>

                  {/* Chat */}
                  <div className="flex-1 flex flex-col gap-2.5 p-3 overflow-hidden" style={{ background: "#e5ddd5" }}>
                    <div className="wa-bubble outgoing">
                      <p className="text-[11px]">Hi Mehta Ji 🙏</p>
                      <p className="text-[11px] mt-1">Invoice <strong>#INV-1042</strong> of <strong>₹41,300</strong> is due today.</p>
                      <p className="text-[11px] mt-1">Pay now: <span className="text-blue-600">invozen.in/pay/1042</span></p>
                      <div className="wa-time">10:30 AM ✓✓</div>
                    </div>

                    <div className="wa-bubble incoming">
                      <p className="text-[11px]">Haan bhai, abhi karta hoon 👍</p>
                      <div className="wa-time">10:45 AM</div>
                    </div>

                    <div
                      className="mx-auto px-2.5 py-1 rounded text-[9px] text-center"
                      style={{ background: "rgba(0,0,0,0.12)", color: "#555" }}
                    >
                      Payment received — ₹41,300 ✓
                    </div>

                    <div className="wa-bubble outgoing opacity-70">
                      <p className="text-[11px]">✅ Payment confirmed! Thank you.</p>
                      <p className="text-[10px] mt-0.5 opacity-70">Reminders cancelled automatically.</p>
                      <div className="wa-time">11:02 AM ✓✓</div>
                    </div>
                  </div>

                  {/* Input bar */}
                  <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#f0f0f0", borderTop: "1px solid #ddd" }}>
                    <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[10px] text-gray-400">Type a message...</div>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#075e54" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
