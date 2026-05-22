export type ServiceLane = {
  id: "next-30-days" | "next-90-days";
  label: string;
  title: string;
  description: string;
  items: {
    title: string;
    description: string;
    shortDescription: string;
  }[];
};

export const serviceLanes: ServiceLane[] = [
  {
    id: "next-30-days",
    label: "Immediate CA Desk",
    title: "Next 30 days",
    description: "The first requests usually center on getting this filing cycle clean, reviewable, and low-risk.",
    items: [
      {
        title: "Monthly GST filing desk",
        description: "Filing-ready summaries, period lock, and a clean final CA review handoff before submission.",
        shortDescription: "Filing-ready summaries and final CA handoff.",
      },
      {
        title: "ITC mismatch queue",
        description: "Purchase versus 2B review with a clear queue for vendor follow-up and claim tracking.",
        shortDescription: "Purchase vs 2B review with vendor follow-up tracking.",
      },
      {
        title: "Error and notice watch",
        description: "GSTIN, HSN, and rate mismatch alerts with visibility into late-filing and notice risk.",
        shortDescription: "Mismatch alerts and late-filing risk visibility.",
      },
      {
        title: "Books cleanup",
        description: "Missing invoices, duplicate entries, unreconciled payments, and document collection before filing.",
        shortDescription: "Missing invoices, duplicates, and unreconciled payments.",
      },
    ],
  },
  {
    id: "next-90-days",
    label: "Growth Controls",
    title: "Next 90 days",
    description: "Once the monthly cycle is stable, businesses start asking for tighter operations and shared control.",
    items: [
      {
        title: "E-invoice and e-way bill ops",
        description: "Threshold readiness with IRN and e-way workflow visibility for dispatch-heavy operations.",
        shortDescription: "Threshold readiness and IRN or e-way workflow visibility.",
      },
      {
        title: "Multi-GSTIN control room",
        description: "Branch-wise liability tracking, shared oversight, and business-unit monitoring in one view.",
        shortDescription: "Branch-wise liability and business-unit monitoring.",
      },
      {
        title: "GST cash-flow forecast",
        description: "Expected tax outflow, collection timing, and payment planning before liabilities pile up.",
        shortDescription: "Expected tax outflow and payment planning.",
      },
      {
        title: "CA collaboration workspace",
        description: "Comments, approval queues, client task requests, and filing handoff in one shared workflow.",
        shortDescription: "Comments, approvals, and filing handoff.",
      },
    ],
  },
];
