export type ControlStatus = "passed" | "error" | "warning" | "pending" | "not_done"
export type ControlType = "ai" | "manual"

export interface ControlGroup {
  name: string
  type: ControlType
  controls: Control[]
}

export interface Control {
  id: string
  code: string
  name: string
  description: string
  status: ControlStatus
  type: ControlType
  group: string
  difficulty?: "Facile" | "Moyen" | "Difficile"
  agent?: string
  lastExecution?: string
  duration?: string
  gap?: {
    amount: number
    percentage: number
  }
  details?: ControlDetails
}

export interface ControlDetails {
  comparisons: Comparison[]
  agentComment: string
  sources: DataSource[]
}

export interface Comparison {
  source: string
  sourceIcon: "pdf" | "excel"
  element: string
  amount: number
  isTotal?: boolean
  gap?: {
    amount: number
    percentage: number
    status: ControlStatus
  }
}

export interface DataSource {
  name: string
  type: "pdf" | "excel"
  reference: string
  url?: string
}

export interface AssetInfo {
  name: string
  location: string
  fund: string
  quarter: string
  expertValue: number
  comptaValue: number
  completedControls: number
  totalControls: number
}

// Default asset info — will be overridden when selecting an asset
export const assetInfo: AssetInfo = {
  name: "Westpark Plaza",
  location: "Frankfurt",
  fund: "LaSalle E-REGI Fund II",
  quarter: "Q4 2025",
  expertValue: 65300000,
  comptaValue: 65300000,
  completedControls: 3,
  totalControls: 20,
}

// Controls — fetched from API per asset. Fallback for Westpark Plaza (WP003).
export let controls: Control[] = []

// Fetch controls from API for the selected asset
export async function fetchControlsFromAPI(assetId: string): Promise<Control[]> {
  try {
    const res = await fetch(`http://localhost:8000/api/assets/${assetId}/controls`)
    if (res.ok) {
      const data = await res.json()
      controls = data
      return data
    }
  } catch (e) {}
  return controls
}

// SSR fallback (Westpark Plaza WP003 — most interesting case with C2 FAIL + C3 FAIL)
controls = [
  {
    id: "c1",
    code: "C1",
    name: "Rapprochement valeur totale",
    description: "Verifie que la valeur totale de l'actif dans le rapport de l'expert correspond a la valeur comptabilisee dans Yardi.",
    status: "passed",
    type: "ai",
    group: "Revue de la Valorisation",
    difficulty: "Facile",
    agent: "Agent Reconciliation",
    lastExecution: "21/03/2026 a 14:32",
    duration: "8 secondes",
    details: {
      comparisons: [
        { source: "Rapport Expert CBRE", sourceIcon: "pdf", element: "Valeur totale actif (FMV)", amount: 65300000 },
        { source: "Yardi Bilan", sourceIcon: "excel", element: "Immobilisations (Fixed Assets)", amount: 65300000 },
        { source: "", sourceIcon: "excel", element: "Ecart", amount: 0, isTotal: true, gap: { amount: 0, percentage: 0, status: "passed" } },
      ],
      agentComment: "La valeur de l'actif dans le rapport de l'expert (65.3 M EUR) correspond exactement a la valeur comptabilisee dans Yardi. Aucun ecart detecte.",
      sources: [
        { name: "Rapport Expert CBRE", type: "pdf", reference: "Page 2, Executive Summary", url: "/api/documents/WP003/file/01_Expert_Valuation_WP003_Q4_2025.pdf" },
        { name: "Yardi Bilan", type: "excel", reference: "Ligne 1000, Investment Property", url: "/api/documents/WP003/file/02_Yardi_BS_WP003_Dec2025.xlsx" },
      ],
    },
  },
  {
    id: "c2",
    code: "C2",
    name: "Controle CAPEX",
    description: "Verifie que les CAPEX engages dans le suivi financier AM sont coherents avec les immobilisations dans Yardi et les deductions de l'expert.",
    status: "error",
    type: "ai",
    group: "Revue de la Valorisation",
    difficulty: "Moyen",
    agent: "Agent Reconciliation",
    lastExecution: "21/03/2026 a 14:32",
    duration: "12 secondes",
    gap: { amount: 847000, percentage: 16.3 },
    details: {
      comparisons: [
        { source: "Rapport Expert CBRE", sourceIcon: "pdf", element: "CAPEX deduit de la valorisation", amount: 5200000 },
        { source: "Yardi Bilan", sourceIcon: "excel", element: "CAPEX en cours (immobilisations YTD)", amount: 5200000 },
        { source: "Suivi CAPEX AM", sourceIcon: "excel", element: "CAPEX consomme (tracker)", amount: 4353000 },
        { source: "", sourceIcon: "excel", element: "Ecart max (expert vs tracker)", amount: 847000, isTotal: true, gap: { amount: 847000, percentage: 16.3, status: "error" } },
      ],
      agentComment: "Ecart de 847 000 EUR (16.3%) entre l'expert (5 200 000 EUR, budget total) et le tracker AM (4 353 000 EUR, depenses reelles). L'expert utilise le budget total comme deduction de la FMV alors que le tracker reflete les depenses effectivement realisees. Les travaux restants (347 000 EUR) sont engages et devraient etre completes d'ici Q2 2026.",
      sources: [
        { name: "Rapport Expert CBRE", type: "pdf", reference: "Page 5, Capital Expenditure", url: "/api/documents/WP003/file/01_Expert_Valuation_WP003_Q4_2025.pdf" },
        { name: "Yardi Bilan", type: "excel", reference: "Ligne 1050, CAPEX Increase YTD", url: "/api/documents/WP003/file/02_Yardi_BS_WP003_Dec2025.xlsx" },
        { name: "Suivi CAPEX AM", type: "excel", reference: "Total row, Consumed EUR", url: "/api/documents/WP003/file/04_CAPEX_Tracker_WP003.xlsx" },
      ],
    },
  },
  {
    id: "c3",
    code: "C3",
    name: "Controle franchises / incentives",
    description: "Verifie la coherence des franchises et incentives entre expert, Yardi P&L et tenant schedule.",
    status: "error",
    type: "ai",
    group: "Revue de la Valorisation",
    difficulty: "Difficile",
    agent: "Agent Anomaly Detection",
    lastExecution: "21/03/2026 a 14:32",
    duration: "15 secondes",
    gap: { amount: 2100000, percentage: 12.3 },
    details: {
      comparisons: [
        { source: "Rapport Expert", sourceIcon: "pdf", element: "Franchises deduites (DCF)", amount: 1450000 },
        { source: "Yardi P&L", sourceIcon: "excel", element: "Franchises comptabilisees", amount: 1450000, gap: { amount: 0, percentage: 0, status: "passed" } },
        { source: "Rapport Expert", sourceIcon: "pdf", element: "Rent-free (DCF)", amount: 520000 },
        { source: "Yardi P&L", sourceIcon: "excel", element: "Rent-free comptabilise", amount: 520000, gap: { amount: 0, percentage: 0, status: "passed" } },
        { source: "Tenant Schedule", sourceIcon: "excel", element: "Commerzbank: Expert 320 EUR/sqm vs Bail 285 EUR/sqm", amount: 2100000, isTotal: true, gap: { amount: 2100000, percentage: 12.3, status: "error" } },
      ],
      agentComment: "L'expert DCF utilise 320 EUR/sqm pour Commerzbank mais le tenant schedule montre un renouvellement signe le 15/11/2025 a 285 EUR/sqm. Delta = 35 EUR/sqm x 2 400 sqm = 84 000 EUR/an. Impact FMV capitalise : ~2 100 000 EUR (3.2% de surestimation). Le Yardi P&L utilise aussi l'ancien loyer a 320 EUR/sqm. Les 3 sources sont desalignees par rapport au bail signe.",
      sources: [
        { name: "Rapport Expert CBRE", type: "pdf", reference: "Page 4, Section 3.2 Franchise & Incentive", url: "/api/documents/WP003/file/01_Expert_Valuation_WP003_Q4_2025.pdf" },
        { name: "Yardi P&L", type: "excel", reference: "Lignes 8000-8130, Franchise Accruals", url: "/api/documents/WP003/file/03_Yardi_PL_WP003_Dec2025.xlsx" },
        { name: "Tenant Schedule AM", type: "excel", reference: "Ligne Commerzbank, Rent/sqm = 285 EUR", url: "/api/documents/WP003/file/05_Tenant_Schedule_WP003.xlsx" },
      ],
    },
  },
  // Group 2: Revenue Review (Manual)
  {
    id: "c4",
    code: "C4",
    name: "Invoiced rent control",
    description: "Verify consistency between invoiced rents and lease terms.",
    status: "not_done",
    type: "manual",
    group: "Revenue Review",
  },
  {
    id: "c5",
    code: "C5",
    name: "Rechargeable expenses control",
    description: "Verify that rechargeable expenses to tenants are correctly accounted for.",
    status: "not_done",
    type: "manual",
    group: "Revenue Review",
  },
  {
    id: "c6",
    code: "C6",
    name: "Arrears control",
    description: "Analyze arrears aging and bad debt provisions.",
    status: "not_done",
    type: "manual",
    group: "Revenue Review",
  },
  {
    id: "c7",
    code: "C7",
    name: "Bank reconciliation",
    description: "Verify consistency between bank statements and accounting records.",
    status: "not_done",
    type: "manual",
    group: "Revenue Review",
  },
  // Group 3: Debt Review
  {
    id: "c8",
    code: "C8",
    name: "Bank debt control",
    description: "Verify the debt balance and drawdown conditions.",
    status: "not_done",
    type: "manual",
    group: "Debt Review",
  },
  {
    id: "c9",
    code: "C9",
    name: "Covenant compliance",
    description: "Verify compliance with banking ratios and covenants.",
    status: "not_done",
    type: "manual",
    group: "Debt Review",
  },
  {
    id: "c10",
    code: "C10",
    name: "Interest control",
    description: "Verify interest calculation for the period.",
    status: "not_done",
    type: "manual",
    group: "Debt Review",
  },
  // Group 4: Cash Management
  {
    id: "c11",
    code: "C11",
    name: "Cash flow analysis",
    description: "Analyze cash flows for the period.",
    status: "not_done",
    type: "manual",
    group: "Cash Management",
  },
  {
    id: "c12",
    code: "C12",
    name: "Cash forecast",
    description: "Verify 12-month cash flow projections.",
    status: "not_done",
    type: "manual",
    group: "Cash Management",
  },
  {
    id: "c13",
    code: "C13",
    name: "Investment control",
    description: "Verify excess cash investments.",
    status: "not_done",
    type: "manual",
    group: "Cash Management",
  },
  // Group 5: Distribution Control
  {
    id: "c14",
    code: "C14",
    name: "Dividend calculation",
    description: "Verify distributable dividend calculation.",
    status: "not_done",
    type: "manual",
    group: "Distribution Control",
  },
  {
    id: "c15",
    code: "C15",
    name: "Commitment compliance",
    description: "Verify compliance with distribution commitments.",
    status: "not_done",
    type: "manual",
    group: "Distribution Control",
  },
  {
    id: "c16",
    code: "C16",
    name: "Tax impact",
    description: "Analyze the tax impact of distributions.",
    status: "not_done",
    type: "manual",
    group: "Distribution Control",
  },
  {
    id: "c17",
    code: "C17",
    name: "AGM validation",
    description: "Prepare elements for validation at the Annual General Meeting.",
    status: "not_done",
    type: "manual",
    group: "Distribution Control",
  },
  // Group 6: Compliance & Regulatory
  {
    id: "c18",
    code: "C18",
    name: "AML/KYC control",
    description: "Verify AML/KYC compliance for new tenants.",
    status: "not_done",
    type: "manual",
    group: "Compliance & Regulatory",
  },
  {
    id: "c19",
    code: "C19",
    name: "Regulatory reporting",
    description: "Prepare regulatory reports (AIFMD, etc.).",
    status: "not_done",
    type: "manual",
    group: "Compliance & Regulatory",
  },
  {
    id: "c20",
    code: "C20",
    name: "Internal audit",
    description: "Prepare elements for internal audit.",
    status: "not_done",
    type: "manual",
    group: "Compliance & Regulatory",
  },
]

export const controlGroups: ControlGroup[] = [
  {
    name: "Fair Value Gap",
    type: "ai",
    controls: controls.filter(c => c.group === "Fair Value Gap"),
  },
  {
    name: "Revenue Review",
    type: "manual",
    controls: controls.filter(c => c.group === "Revenue Review"),
  },
  {
    name: "Debt Review",
    type: "manual",
    controls: controls.filter(c => c.group === "Debt Review"),
  },
  {
    name: "Cash Management",
    type: "manual",
    controls: controls.filter(c => c.group === "Cash Management"),
  },
  {
    name: "Distribution Control",
    type: "manual",
    controls: controls.filter(c => c.group === "Distribution Control"),
  },
  {
    name: "Compliance & Regulatory",
    type: "manual",
    controls: controls.filter(c => c.group === "Compliance & Regulatory"),
  },
]

export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value / 1000000) + " M€"
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
