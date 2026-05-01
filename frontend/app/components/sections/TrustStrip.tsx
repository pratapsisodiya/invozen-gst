const items = [
  { label: "GSTN Registered", icon: "✦" },
  { label: "Raj Electronics, Mumbai", icon: "★" },
  { label: "Auto GST Calculation", icon: "✦" },
  { label: "Aggarwal Distributors, Delhi", icon: "★" },
  { label: "GSTR-1 / 3B Ready", icon: "✦" },
  { label: "Priya Designs, Bangalore", icon: "★" },
  { label: "WhatsApp Reminders", icon: "✦" },
  { label: "Shine Services, Chennai", icon: "★" },
  { label: "Mobile First", icon: "✦" },
  { label: "FastFab Textiles, Surat", icon: "★" },
  { label: "Accountant Friendly", icon: "✦" },
  { label: "Mehta Traders, Pune", icon: "★" },
  { label: "Razorpay Payments", icon: "✦" },
  { label: "10,000+ Businesses", icon: "★" },
];

// Duplicate for seamless loop
const doubled = [...items, ...items];

export default function TrustStrip() {
  return (
    <section
      className="py-5 border-y"
      style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}
      aria-label="Social proof"
    >
      <div className="marquee-container">
        <div className="marquee-track">
          {doubled.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-6 py-0 select-none shrink-0"
            >
              <span
                className="text-[10px] font-bold"
                style={{ color: "#0d9488" }}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span
                className="text-sm font-semibold whitespace-nowrap"
                style={{ color: "var(--text-2)" }}
              >
                {item.label}
              </span>
              <span
                className="text-[10px] ml-2"
                style={{ color: "var(--text-faint)" }}
                aria-hidden="true"
              >
                /
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
