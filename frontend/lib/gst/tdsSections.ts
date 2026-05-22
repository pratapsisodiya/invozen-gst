export interface TDSSection {
  code: string
  label: string
  rate: number
}

export const TDS_SECTIONS: TDSSection[] = [
  { code: '194C', label: '194C — Contractors / Sub-contractors', rate: 1 },
  { code: '194J', label: '194J — Professional / Technical Services', rate: 10 },
  { code: '194H', label: '194H — Commission / Brokerage', rate: 5 },
  { code: '194I', label: '194I — Rent (Plant & Machinery)', rate: 2 },
  { code: '194IA', label: '194IA — Rent (Land, Building, Furniture)', rate: 10 },
  { code: '194A', label: '194A — Interest (other than securities)', rate: 10 },
  { code: '194B', label: '194B — Winnings from lottery/games', rate: 30 },
  { code: '194D', label: '194D — Insurance Commission', rate: 5 },
  { code: '194M', label: '194M — Payment to contractor/professional (individual)', rate: 5 },
  { code: '194Q', label: '194Q — Purchase of goods', rate: 0.1 },
]
