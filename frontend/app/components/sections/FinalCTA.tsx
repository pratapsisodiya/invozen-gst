"use client";

import { useEffect, useRef } from "react";
import AnimatedSection from "@/app/components/ui/AnimatedSection";
import { CheckIcon, ArrowRightIcon, WhatsAppIcon } from "@/app/components/ui/Icons";

const bullets = [
  "No accounting setup needed",
  "Free 14-day trial, no credit card",
  "Onboard in 5 minutes",
  "Works on mobile and desktop",
];

export default function FinalCTA() {
  const bgRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (!bgRef.current || !parallaxRef.current) return;
          const rect = bgRef.current.getBoundingClientRect();
          const progress = -rect.top / (rect.height + window.innerHeight);
          parallaxRef.current.style.transform = `translateY(${progress * 40}px)`;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      ref={bgRef}
      className="relative overflow-hidden py-20 md:py-32"
      style={{
        background: "linear-gradient(145deg, #0c7a71 0%, #0d9488 40%, #059669 100%)",
      }}
    >
      {/* Parallax layer */}
      <div
        ref={parallaxRef}
        className="absolute inset-0 pointer-events-none"
        style={{ willChange: "transform" }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Decorative blobs */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(5,150,105,0.4) 0%, transparent 70%)" }}
        />
      </div>

      <div className="container-page relative">
        <div className="max-w-2xl mx-auto text-center flex flex-col items-center gap-7">
          <AnimatedSection variant="scale">
            <h2 className="text-section text-white">
              Start sending GST-ready invoices{" "}
              <span className="font-display italic" style={{ color: "rgba(255,255,255,0.75)" }}>
                in minutes
              </span>
            </h2>
          </AnimatedSection>

          <AnimatedSection delay={1}>
            <p className="text-[1.0625rem] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
              Join 10,000+ Indian businesses that invoice faster, collect sooner, and file with less stress. Set up your GSTIN, create your first invoice, and share it — all in under 5 minutes.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={2}>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
                  <CheckIcon size={13} strokeWidth={2.5} className="text-green-300 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </AnimatedSection>

          <AnimatedSection delay={3}>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="#signup"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-brand-700 text-sm font-extrabold rounded-2xl hover:bg-brand-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                Start Free Trial
                <ArrowRightIcon size={16} strokeWidth={2.5} />
              </a>
              <a
                href="https://wa.me/919999999999?text=Hi, I want to try Invozen GST"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold rounded-2xl border-2 border-white/30 text-white hover:bg-white/10 transition-all"
              >
                <WhatsAppIcon size={16} />
                Chat on WhatsApp
              </a>
            </div>
            <p className="mt-3 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
              ₹999/month after trial · No lock-in · Cancel anytime
            </p>
          </AnimatedSection>

          {/* Social proof */}
          <AnimatedSection delay={4}>
            <div
              className="flex items-center gap-4 px-6 py-4 rounded-2xl"
              style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <div className="flex -space-x-2.5">
                {["R","P","A","M","S"].map((l, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 border-white/60 flex items-center justify-center text-xs font-extrabold text-white"
                    style={{ background: ["#0d9488","#059669","#0c7a71","#047857","#0d9488"][i] }}
                  >
                    {l}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <div className="flex gap-0.5 mb-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} className="text-amber-300 text-xs">★</span>
                  ))}
                </div>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                  <span className="font-extrabold text-white">4.9/5</span>{" "}from 500+ reviews
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
