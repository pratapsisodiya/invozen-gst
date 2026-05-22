import Link from "next/link";
import {
  AlertTriangle,
  BarChart2,
  BookOpen,
  Building2,
  FileText,
  Files,
  Truck,
  Users,
} from "lucide-react";
import { serviceLanes } from "@/app/components/servicesRoadmapContent";

const cardIcons = [
  FileText,
  Files,
  AlertTriangle,
  BookOpen,
  Truck,
  Building2,
  BarChart2,
  Users,
];

export function CAPriorityBoard() {
  return (
    <section
      className="rounded-2xl bg-white p-4 lg:p-5"
      style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      aria-labelledby="ca-priority-board-title"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--text-faint)" }}>
            CA Priority Board
          </p>
          <h2 id="ca-priority-board-title" className="text-base font-semibold mt-1" style={{ color: "var(--text)" }}>
            What your business will ask for next
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Static roadmap for the next service layer after invoicing, filing, and collections.
          </p>
        </div>
        <Link
          href="/#services"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Learn more
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {serviceLanes.map((lane, laneIndex) => (
          <div
            key={lane.id}
            className="rounded-xl p-4"
            style={{
              background: laneIndex === 0 ? "var(--surface)" : "rgba(245,158,11,0.05)",
              border: "1px solid var(--border-soft)",
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {lane.title}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {lane.description}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  background: laneIndex === 0 ? "rgba(13,148,136,0.1)" : "rgba(245,158,11,0.12)",
                  color: laneIndex === 0 ? "#0c7a71" : "#b45309",
                }}
              >
                {lane.items.length} services
              </span>
            </div>

            <div className="grid gap-2.5">
              {lane.items.map((item, itemIndex) => {
                const Icon = cardIcons[laneIndex * 4 + itemIndex];

                return (
                  <div
                    key={item.title}
                    className="flex gap-3 rounded-xl bg-white px-3 py-3"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <div
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: laneIndex === 0 ? "rgba(13,148,136,0.1)" : "rgba(245,158,11,0.12)",
                        color: laneIndex === 0 ? "#0c7a71" : "#b45309",
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                        {item.title}
                      </p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {item.shortDescription}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
