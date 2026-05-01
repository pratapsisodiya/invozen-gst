"use client";

import { useState } from "react";
import AnimatedSection from "@/app/components/ui/AnimatedSection";
import { ChevronDownIcon } from "@/app/components/ui/Icons";

const faqs = [
  { q: "Is Invozen GST a replacement for Tally?", a: "Not exactly — and that's intentional. Tally is a full accounting suite built for CAs and large businesses. Invozen is built for small business owners who need compliant invoicing and GST filing support without the complexity. If you spend most of your time on invoicing, dues tracking, and GSTR filing, Invozen handles that workflow beautifully." },
  { q: "Can my accountant still use the data?", a: "Absolutely. Add your CA as a read-only user. They get invoice summaries, GSTR-1/3B exports (Excel/CSV), and reconciliation reports — everything needed to file returns without disrupting your workflow. Most CAs prefer this clean export over scattered WhatsApp invoices." },
  { q: "Does it support CGST, SGST, and IGST automatically?", a: "Yes. Invozen determines the correct GST type from your GSTIN and the buyer's GSTIN. Same state = CGST + SGST. Different state = IGST. No manual selection needed — just enter the buyer's GSTIN and the system handles it." },
  { q: "Can I send WhatsApp payment reminders?", a: "Yes. Configure automated reminders via WhatsApp at intervals you choose — 3 days before due, on the due date, and after overdue. Each reminder includes the invoice amount and a Razorpay payment link. Reminders automatically stop once payment is received." },
  { q: "Is it suitable for freelancers?", a: "Invozen is built for GST-registered businesses. If you're registered (or above the threshold and need to register), Invozen is a perfect fit. You can still use it for professional invoicing even if you're pre-registration — but GST-specific features like GSTR exports are designed for registered businesses." },
  { q: "Can I use it on my phone?", a: "Invozen is designed mobile-first. The full product — invoice creation, payment tracking, reminders, and reports — works on any smartphone browser. We also offer dedicated Android and iOS apps. Most users run 80–90% of their workflow from their phones." },
  { q: "Does it support the GST composition scheme?", a: "Yes. Composition scheme businesses pay GST at a flat rate and cannot charge GST on invoices. Invozen supports composition scheme invoicing — create a 'Bill of Supply' instead of a regular tax invoice, which is the correct format for composition dealers." },
  { q: "Can I add multiple GSTINs?", a: "Multiple GSTIN support is on the Enterprise plan, designed for multi-branch businesses, distributors, or CAs managing many clients. Reach out to our sales team for tailored pricing." },
  { q: "What happens after my 14-day trial ends?", a: "Choose the Pro plan at ₹999/month to continue. Your data is preserved regardless of decision. If you decide not to continue, you can export all invoices and data before the account is archived. No data is deleted immediately." },
  { q: "Can I migrate from Tally or Zoho Books?", a: "You can upload an Excel CSV of existing customer and product data to jumpstart your setup. For historical invoice migration from Tally or other tools, our support team assists with the data format. Most businesses are fully set up within a day." },
  { q: "Does it support e-invoicing and e-way bills?", a: "Invozen supports the e-invoice workflow (IRN generation and QR code embedding) for businesses above the ₹5 Cr turnover threshold. E-way bill note fields are available for transport invoices. Full e-way bill API integration is on the roadmap." },
  { q: "Can this later support international tax invoicing?", a: "Our roadmap includes expansion into UK VAT, EU VAT (OSS), and Singapore GST — markets with similar structured tax invoicing requirements. The core architecture is tax-agnostic. If you're also selling internationally, reach out — we'd love to hear your workflow." },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  const toggle = (i: number) => setOpen((p) => (p === i ? null : i));

  return (
    <section id="faq" className="py-20 md:py-28" style={{ background: "var(--bg-warm)" }}>
      <div className="container-page">
        <div className="grid lg:grid-cols-[2fr_3fr] gap-12 lg:gap-16">
          {/* Sticky left */}
          <AnimatedSection variant="left" className="lg:sticky lg:top-24 lg:self-start">
            <div className="section-chip mb-4">FAQ</div>
            <h2 className="text-section mb-4" style={{ color: "var(--text)" }}>
              Common<br />
              <span className="font-display italic grad-text">questions answered</span>
            </h2>
            <p className="text-base mb-6" style={{ color: "var(--text-muted)" }}>
              Still not sure? We&apos;re happy to help.
            </p>
            <a
              href="https://wa.me/919999999999?text=Hi, I have a question about Invozen GST"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 bg-white"
              style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              <span className="text-green-600 text-base">💬</span>
              Chat on WhatsApp
            </a>
          </AnimatedSection>

          {/* Accordion */}
          <AnimatedSection delay={1} variant="right">
            <div
              className="flex flex-col rounded-2xl overflow-hidden bg-white"
              style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
            >
              {faqs.map((faq, i) => (
                <div key={i} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                  <button
                    id={`faq-btn-${i}`}
                    type="button"
                    aria-expanded={open === i}
                    aria-controls={`faq-answer-${i}`}
                    onClick={() => toggle(i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-brand-50"
                    style={{ color: open === i ? "#0d9488" : "var(--text)" }}
                  >
                    <span className="text-sm font-bold leading-snug">{faq.q}</span>
                    <span
                      className="shrink-0 transition-transform duration-300 inline-flex"
                      style={{ transform: open === i ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      <ChevronDownIcon size={17} className="text-current" />
                    </span>
                  </button>

                  <div
                    id={`faq-answer-${i}`}
                    role="region"
                    aria-labelledby={`faq-btn-${i}`}
                    className={`faq-answer-grid ${open === i ? "open" : ""}`}
                  >
                    <div className="faq-answer-inner">
                      <p className="px-5 pb-5 pt-0 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
