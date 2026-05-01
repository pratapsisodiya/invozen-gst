import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "white";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  href?: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 shadow-sm hover:shadow-md",
  secondary:
    "bg-teal-50 text-teal-700 hover:bg-teal-100 active:bg-teal-200",
  ghost:
    "text-zinc-600 hover:text-teal-600 hover:bg-teal-50 active:bg-teal-100",
  outline:
    "border border-zinc-200 text-zinc-700 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50",
  white:
    "bg-white text-teal-700 hover:bg-teal-50 shadow-sm hover:shadow-md",
};

const sizeClasses: Record<Size, string> = {
  sm:  "px-3.5 py-1.5 text-sm rounded-md gap-1.5",
  md:  "px-4.5 py-2.5 text-sm rounded-lg gap-2",
  lg:  "px-6 py-3 text-base rounded-lg gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  href,
  children,
  className = "",
  target,
  rel,
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center font-medium",
    "transition-all duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600",
    "cursor-pointer select-none whitespace-nowrap",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <a href={href} className={classes} target={target} rel={rel}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={classes}>
      {children}
    </button>
  );
}
