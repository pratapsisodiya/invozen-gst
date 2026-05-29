export type MobileServiceLane = {
  id: "next-30-days" | "next-90-days";
  title: string;
  description: string;
  items: {
    title: string;
    summary: string;
  }[];
};

export const mobileServiceLanes: MobileServiceLane[] = [
  {
    id: "next-30-days",
    title: "Next 30 days",
    description: "What a CA will usually need for the current filing cycle.",
    items: [
      {
        title: "Monthly GST filing desk",
        summary: "Filing-ready summaries and final CA handoff.",
      },
      {
        title: "ITC mismatch queue",
        summary: "Purchase vs 2B review with vendor follow-up tracking.",
      },
      {
        title: "Error and notice watch",
        summary: "Mismatch alerts and late-filing risk visibility.",
      },
      {
        title: "Books cleanup",
        summary: "Missing invoices, duplicates, and unreconciled payments.",
      },
    ],
  },
  {
    id: "next-90-days",
    title: "Next 90 days",
    description: "What businesses usually ask for after the monthly desk is stable.",
    items: [
      {
        title: "E-invoice and e-way bill ops",
        summary: "Threshold readiness and IRN or e-way workflow visibility.",
      },
      {
        title: "Multi-GSTIN control room",
        summary: "Branch-wise liability and business-unit monitoring.",
      },
      {
        title: "GST cash-flow forecast",
        summary: "Expected tax outflow and payment planning.",
      },
      {
        title: "CA collaboration workspace",
        summary: "Comments, approvals, and filing handoff.",
      },
    ],
  },
];
