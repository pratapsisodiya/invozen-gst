import AnimatedSection from "@/app/components/ui/AnimatedSection";
import {
  BarChartIcon,
  BellIcon,
  CalculatorIcon,
  FileTextIcon,
  RefreshIcon,
  TruckIcon,
  UsersIcon,
  WrenchIcon,
} from "@/app/components/ui/Icons";
import { serviceLanes } from "@/app/components/servicesRoadmapContent";

const serviceIcons = [
  FileTextIcon,
  RefreshIcon,
  BellIcon,
  WrenchIcon,
  TruckIcon,
  UsersIcon,
  CalculatorIcon,
  BarChartIcon,
];

export default function ServicesRoadmapSection() {
  return (
    <section
      id="services"
      className="py-20 md:py-28 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, rgba(13,148,136,0.04) 0%, rgba(255,255,255,0) 100%)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at top right, rgba(13,148,136,0.08), transparent 38%)",
        }}
        aria-hidden="true"
      />

      <div className="container-page relative">
        <AnimatedSection className="max-w-3xl mb-12 md:mb-14">
          <div className="section-chip mb-4">Services Roadmap</div>
          <h2 className="text-section mb-4" style={{ color: "var(--text)" }}>
            What your CA will ask for{" "}
            <span className="font-display italic grad-text">right after invoicing works</span>
          </h2>
          <p className="text-[1.0625rem] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Invozen starts with invoices and GST records, but the next layer is ongoing compliance operations.
            This is the service stack most businesses need next.
          </p>
        </AnimatedSection>

        <div className="grid xl:grid-cols-2 gap-5">
          {serviceLanes.map((lane, laneIndex) => (
            <AnimatedSection
              key={lane.id}
              delay={(laneIndex + 1) as 1 | 2}
              variant={laneIndex === 0 ? "left" : "right"}
            >
              <div
                className="h-full rounded-[28px] p-6 md:p-7 bg-white"
                style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.18em]"
                    style={{
                      background: laneIndex === 0 ? "rgba(13,148,136,0.1)" : "rgba(245,158,11,0.12)",
                      color: laneIndex === 0 ? "#0c7a71" : "#b45309",
                    }}
                  >
                    {lane.label}
                  </span>
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                    {lane.title}
                  </p>
                </div>

                <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
                  {lane.description}
                </p>

                <div className="grid gap-3">
                  {lane.items.map((item, itemIndex) => {
                    const Icon = serviceIcons[laneIndex * 4 + itemIndex];

                    return (
                      <div
                        key={item.title}
                        className="rounded-2xl p-4 md:p-5"
                        style={{
                          background: laneIndex === 0 ? "var(--surface)" : "rgba(245,158,11,0.06)",
                          border: "1px solid var(--border-soft)",
                        }}
                      >
                        <div className="flex gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: laneIndex === 0 ? "rgba(13,148,136,0.1)" : "rgba(245,158,11,0.12)",
                            }}
                          >
                            <Icon
                              size={18}
                              className={laneIndex === 0 ? "text-brand-600" : "text-accent-600"}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>
                              {item.title}
                            </p>
                            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
