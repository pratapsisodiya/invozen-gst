"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Variant = "up" | "left" | "right" | "scale";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: 0 | 1 | 2 | 3 | 4 | 5;
  as?: keyof React.JSX.IntrinsicElements;
  threshold?: number;
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  up:    "reveal",
  left:  "reveal-left",
  right: "reveal-right",
  scale: "reveal-scale",
};

export default function AnimatedSection({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
  threshold = 0.08,
  variant = "up",
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -24px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const base = variantClass[variant];
  const delayClass = delay > 0 ? `reveal-delay-${delay}` : "";
  const AnyTag = Tag as "div";

  return (
    <AnyTag
      ref={ref as React.Ref<HTMLDivElement>}
      className={[base, delayClass, className].filter(Boolean).join(" ")}
    >
      {children}
    </AnyTag>
  );
}
