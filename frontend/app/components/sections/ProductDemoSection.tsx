"use client";

import { useState } from "react";
import AnimatedSection from "@/app/components/ui/AnimatedSection";

const tabs = [
  { id: "invoice",   label: "Create Invoice" },
  { id: "gst",       label: "GST Filing" },
  { id: "reports",   label: "Reports" },
  { id: "reminders", label: "Reminders" },
];

export default function ProductDemoSection() {
  const [active, setActive] = useState("invoice");

  return (
    <section id="demo" className="py-20 md:py-28 relative overflow-hidden" style={{ background: "var(--surface)" }}>
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" aria-hidden="true" />
      <div className="container-page relative">
        <AnimatedSection className="max-w-xl mb-10">
          <div className="section-chip mb-4">Product Tour</div>
          <h2 className="text-section mb-4" style={{ color: "var(--text)" }}>
            A workspace that{" "}
            <span className="font-display italic grad-text">actually fits your workflow</span>
          </h2>
          <p className="text-[1.0625rem]" style={{ color: "var(--text-muted)" }}>
            Invoice creation to filing-ready reports — in one clean, fast interface.
          </p>
        </AnimatedSection>

        {/* Tab bar */}
        <AnimatedSection delay={1}>
          <div
            className="inline-flex items-center gap-1 p-1 rounded-2xl mb-8"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            role="tablist"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active === tab.id}
                onClick={() => setActive(tab.id)}
                className="px-4 py-2 text-sm font-bold rounded-xl transition-all"
                style={{
                  background: active === tab.id ? "#0d9488" : "transparent",
                  color: active === tab.id ? "#fff" : "var(--text-muted)",
                  boxShadow: active === tab.id ? "var(--shadow-sm)" : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </AnimatedSection>

        {/* Tab panel */}
        <AnimatedSection delay={2}>
          <div className="mockup-window">
            <div className="mockup-titlebar">
              <span className="mockup-dot bg-red-400" />
              <span className="mockup-dot bg-amber-400" />
              <span className="mockup-dot bg-green-400" />
              <span className="ml-3 text-[10px]" style={{ color: "var(--text-faint)" }}>
                Invozen GST — {tabs.find((t) => t.id === active)?.label}
              </span>
            </div>
            <div className="min-h-72 md:min-h-80 bg-white" role="tabpanel">
              {active === "invoice"   && <InvoiceTab />}
              {active === "gst"       && <GSTTab />}
              {active === "reports"   && <ReportsTab />}
              {active === "reminders" && <RemindersTab />}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

function InvoiceTab() {
  return (
    <div className="p-5 grid md:grid-cols-2 gap-5">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-extrabold text-ink-700">Invoice Details</p>
        <div className="grid grid-cols-2 gap-2">
          <div><p className="mockup-label mb-1">Invoice No.</p><div className="mockup-input">INV-2024-0042</div></div>
          <div><p className="mockup-label mb-1">Date</p><div className="mockup-input">15 Jan 2024</div></div>
        </div>
        <div><p className="mockup-label mb-1">Bill To</p><div className="mockup-input">Mehta Enterprises — 27AABCM9876K1Z2</div></div>
        <div>
          <p className="mockup-label mb-1">Place of Supply</p>
          <div className="mockup-input flex items-center gap-2">
            <span className="text-ink-700">Maharashtra (27)</span>
            <span className="mockup-chip bg-brand-50 text-brand-700 ml-auto">CGST + SGST</span>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="grid grid-cols-4 px-2.5 py-1.5 text-[9px] font-extrabold" style={{ background: "var(--surface)", color: "var(--text-faint)" }}>
            <span className="col-span-2">Item / HSN</span><span className="text-right">Rate</span><span className="text-right">Taxable</span>
          </div>
          {[{ i:"Consulting (998313)", r:"18%", t:"₹25,000" },{ i:"Software (998431)", r:"18%", t:"₹10,000" }].map((r,idx)=>(
            <div key={idx} className="grid grid-cols-4 px-2.5 py-1.5 text-[10px]" style={{ borderTop:"1px solid var(--border)", color:"var(--text)" }}>
              <span className="col-span-2 truncate">{r.i}</span>
              <span className="text-right text-ink-400">{r.r}</span>
              <span className="text-right font-semibold">{r.t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xs font-extrabold text-ink-700">Tax Summary</p>
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {[{ l:"Subtotal", v:"₹35,000" },{ l:"CGST @ 9%", v:"₹3,150" },{ l:"SGST @ 9%", v:"₹3,150" }].map((r)=>(
            <div key={r.l} className="flex items-center justify-between text-[11px]">
              <span style={{ color:"var(--text-muted)" }}>{r.l}</span>
              <span className="font-semibold" style={{ color:"var(--text)" }}>{r.v}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2" style={{ borderTop:"1px solid var(--border)" }}>
            <span className="text-xs font-extrabold" style={{ color:"var(--text)" }}>Total</span>
            <span className="text-base font-extrabold text-brand-600">₹41,300</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="flex-1 py-2 text-[11px] font-extrabold bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors">Send Invoice</button>
          <button type="button" className="px-3 py-2 text-[11px] font-semibold rounded-xl transition-colors" style={{ border:"1px solid var(--border)", color:"var(--text-muted)" }}>PDF</button>
        </div>
        <div className="flex gap-2">
          <span className="mockup-chip bg-ok-50 text-ok-600 text-[10px] py-1">✓ GST Validated</span>
          <span className="mockup-chip bg-brand-50 text-brand-700 text-[10px] py-1">GSTR-1 Ready</span>
        </div>
      </div>
    </div>
  );
}

function GSTTab() {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-extrabold text-ink-700">GSTR-1 Summary — Jan 2024</p>
          <p className="text-[10px] text-ink-400 mt-0.5">Filing period: 01–31 Jan 2024</p>
        </div>
        <button type="button" className="px-3 py-1.5 bg-brand-600 text-white text-[11px] font-bold rounded-xl">Export for Filing</button>
      </div>
      <div className="grid sm:grid-cols-4 gap-3 mb-5">
        {[{ l:"Total Sales", v:"₹4,82,000", s:"32 invoices" },{ l:"Taxable Value", v:"₹4,08,474", s:"Before GST" },{ l:"Total GST", v:"₹73,526", s:"Collected" },{ l:"Net Payable", v:"₹61,244", s:"After ITC" }].map((s)=>(
          <div key={s.l} className="p-3 rounded-2xl" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
            <p className="text-[9px] text-ink-400 mb-1">{s.l}</p>
            <p className="text-sm font-extrabold text-brand-600">{s.v}</p>
            <p className="text-[9px] text-ink-400">{s.s}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid var(--border)" }}>
        <div className="grid grid-cols-5 px-3 py-2 text-[9px] font-extrabold" style={{ background:"var(--surface)", color:"var(--text-faint)" }}>
          <span className="col-span-2">Customer</span><span className="text-right">Taxable</span><span className="text-right">GST</span><span className="text-right">Status</span>
        </div>
        {[
          { c:"Mehta Enterprises", t:"₹41,300", g:"₹7,434", s:"Filed", ok:true },
          { c:"Raj Traders", t:"₹28,000", g:"₹5,040", s:"Pending", ok:false },
          { c:"Shine Services", t:"₹15,500", g:"₹2,790", s:"Filed", ok:true },
        ].map((r,i)=>(
          <div key={i} className="grid grid-cols-5 px-3 py-2 text-[10px] items-center" style={{ borderTop:"1px solid var(--border)", color:"var(--text)" }}>
            <span className="col-span-2 truncate">{r.c}</span>
            <span className="text-right">{r.t}</span>
            <span className="text-right text-brand-600 font-semibold">{r.g}</span>
            <span className="text-right"><span className={`mockup-chip text-[9px] ${r.ok ? "bg-ok-50 text-ok-600" : "bg-warn-50 text-warn-600"}`}>{r.s}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsTab() {
  return (
    <div className="p-5">
      <p className="text-xs font-extrabold text-ink-700 mb-4">Business Overview — FY 2023-24</p>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <p className="text-[10px] font-semibold text-ink-400 mb-3">Monthly Revenue (₹ Lakh)</p>
          <div className="flex items-end gap-1.5 h-24">
            {[3.2,4.1,3.8,5.2,4.7,6.1,5.5,7.2,6.8,8.1,7.5,9.2].map((v,i)=>(
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full rounded-sm" style={{ height:`${(v/9.2)*80}px`, background: i===11 ? "#0d9488" : "var(--surface-2)", border: "1px solid var(--border)" }} />
                <span className="text-[7px] text-ink-400">{["A","M","J","J","A","S","O","N","D","J","F","M"][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {[
            { l:"Total Revenue", v:"₹72.4L", c:"+24% YoY", pos:true },
            { l:"GST Collected", v:"₹13.03L", c:"Compliant", pos:true },
            { l:"Outstanding Dues", v:"₹4.2L", c:"14 invoices", pos:false },
            { l:"Avg Invoice Value", v:"₹12,400", c:"+8% vs last yr", pos:true },
          ].map((s)=>(
            <div key={s.l} className="flex items-center justify-between py-2" style={{ borderBottom:"1px solid var(--border)" }}>
              <span className="text-[10px] text-ink-400">{s.l}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold" style={{ color:"var(--text)" }}>{s.v}</span>
                <span className={`text-[9px] font-semibold ${s.pos ? "text-green-600" : "text-amber-600"}`}>{s.c}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RemindersTab() {
  return (
    <div className="p-5 grid md:grid-cols-2 gap-5">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-extrabold text-ink-700">Reminder Schedule</p>
        {[
          { t:"3 days before due", s:"Active", ok:true },
          { t:"On due date", s:"Active", ok:true },
          { t:"3 days overdue", s:"Active", ok:true },
          { t:"7 days overdue", s:"Paused", ok:false },
        ].map((r,i)=>(
          <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
            <div className="flex items-center gap-2.5">
              <div className={`w-1.5 h-1.5 rounded-full ${r.ok ? "bg-brand-500" : "bg-ink-300"}`} />
              <span className="text-[11px] font-semibold" style={{ color:"var(--text)" }}>{r.t}</span>
            </div>
            <span className={`mockup-chip text-[9px] ${r.ok ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-500"}`}>{r.s}</span>
          </div>
        ))}
        <p className="text-[10px] text-ink-400">Reminders auto-stop on payment.</p>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xs font-extrabold text-ink-700">Recent Activity</p>
        {[
          { c:"Mehta Enterprises", a:"₹41,300", e:"Paid", cls:"bg-ok-50 text-ok-600", t:"2h ago" },
          { c:"Raj Traders", a:"₹28,000", e:"Reminder sent", cls:"bg-brand-50 text-brand-700", t:"5h ago" },
          { c:"Shine Services", a:"₹15,500", e:"Viewed", cls:"bg-blue-50 text-blue-600", t:"Yesterday" },
          { c:"K. Patel & Co.", a:"₹8,750", e:"Overdue", cls:"bg-err-50 text-err-600", t:"3d ago" },
        ].map((r,i)=>(
          <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom:"1px solid var(--border)" }}>
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-extrabold text-brand-700 shrink-0">{r.c[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate" style={{ color:"var(--text)" }}>{r.c}</p>
              <p className="text-[10px] text-ink-400">{r.a}</p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className={`mockup-chip ${r.cls} text-[9px]`}>{r.e}</span>
              <span className="text-[9px] text-ink-400">{r.t}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
