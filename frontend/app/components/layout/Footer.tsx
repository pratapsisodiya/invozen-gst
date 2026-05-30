import BrandMark from "@/app/components/layout/BrandMark";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="border-t"
      style={{ borderColor: "var(--border-soft)", background: "var(--surface)" }}
    >
      <div className="container-page py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <BrandMark size={26} />
              <div className="leading-none">
                <div className="font-extrabold text-ink-900 text-base">Invozen</div>
                <div
                  className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded mt-0.5 inline-block"
                  style={{ background: "rgba(13,148,136,0.1)", color: "#0d9488" }}
                >
                  GST
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: "var(--text-muted)" }}>
              The simplest GST invoicing and compliance workspace for India&apos;s small businesses. Invoice fast. File right.
            </p>
            <div className="flex items-center gap-3">
              <SocialLink href="https://wa.me/919999999999" label="WhatsApp">
                <WAIcon />
              </SocialLink>
              <SocialLink href="#twitter" label="Twitter / X">
                <XIcon />
              </SocialLink>
              <SocialLink href="#linkedin" label="LinkedIn">
                <LIIcon />
              </SocialLink>
            </div>
          </div>

          {/* Product */}
          <FooterCol title="Product" links={["Features", "Pricing", "Demo", "Changelog", "Status"]} />

          {/* Resources */}
          <FooterCol title="Resources" links={["GST Guide", "Blog", "API Docs", "Help Centre", "Webinars"]} />

          {/* Company */}
          <FooterCol title="Company" links={["About", "Careers", "Privacy Policy", "Terms of Service", "Contact"]} />
        </div>

        <div
          className="mt-12 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ borderTop: "1px solid var(--border-soft)" }}
        >
          <div className="flex flex-col gap-1">
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              © {year} Invozen Technologies Pvt. Ltd. All rights reserved.
            </p>
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              Invozen is not affiliated with the GST Council or CBIC.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-faint)" }}>
            <span>Made with</span>
            <span className="text-red-400 text-sm">♥</span>
            <span>for Indian businesses</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p
        className="text-[11px] font-extrabold uppercase tracking-widest"
        style={{ color: "var(--text-faint)" }}
      >
        {title}
      </p>
      <ul className="flex flex-col gap-2.5">
        {links.map((item) => (
          <li key={item}>
            <a
              href="#"
              className="text-sm font-medium hover:text-brand-600 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              {item}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
      style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
    >
      {children}
    </a>
  );
}

function WAIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.528 5.855L.057 23.94l6.304-1.448A11.932 11.932 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 0 1-5.047-1.394l-.361-.215-3.742.98.998-3.645-.235-.375A9.798 9.798 0 0 1 2.182 12c0-5.418 4.4-9.818 9.818-9.818 5.418 0 9.818 4.4 9.818 9.818 0 5.418-4.4 9.818-9.818 9.818z"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function LIIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}
