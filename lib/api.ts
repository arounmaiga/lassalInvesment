/**
 * API client — fetches data from the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

// ── Types (matching backend Pydantic models) ──

export interface Fund {
  id: string
  name: string
  code: string
  aum: number
  assetsCount: number
  currency: string
}

export interface Campaign {
  id: string
  fundId: string
  fundName: string
  fundCode: string
  quarter: string
  year: number
  status: "draft" | "in_progress" | "completed" | "validated"
  createdAt: string
  updatedAt: string
  completedAt?: string
  assetsCount: number
  controlsTotal: number
  controlsPassed: number
  controlsError: number
  controlsWarning: number
  controlsPending: number
  totalAUM: number
  validatedBy?: string
}

export interface CampaignAsset {
  id: string
  name: string
  location: string
  expertValue: number
  comptaValue: number
  controlsTotal: number
  controlsPassed: number
  controlsError: number
  controlsWarning: number
  status: "passed" | "error" | "warning" | "pending" | "not_done"
}

export interface GapInfo {
  amount: number
  percentage: number
  status?: string
}

export interface Comparison {
  source: string
  sourceIcon: "pdf" | "excel"
  element: string
  amount: number
  isTotal?: boolean
  gap?: GapInfo
}

export interface DataSource {
  name: string
  type: "pdf" | "excel"
  reference: string
}

export interface ControlDetails {
  comparisons: Comparison[]
  agentComment: string
  sources: DataSource[]
}

export interface Control {
  id: string
  code: string
  name: string
  description: string
  status: "passed" | "error" | "warning" | "pending" | "not_done"
  type: "ai" | "manual"
  group: string
  difficulty?: "Facile" | "Moyen" | "Difficile"
  agent?: string
  lastExecution?: string
  duration?: string
  gap?: GapInfo
  details?: ControlDetails
}

export interface AgentDef {
  name: string
  role: string
  tools: string[]
  status: string
  messagesCount: number
  toolCallsCount: number
}

// ── API Functions ──

export async function fetchFunds(): Promise<Fund[]> {
  return fetchJSON<Fund[]>("/funds")
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  return fetchJSON<Campaign[]>("/campaigns")
}

export async function fetchCampaign(campaignId: string): Promise<Campaign> {
  return fetchJSON<Campaign>(`/campaigns/${campaignId}`)
}

export async function fetchCampaignAssets(campaignId: string): Promise<CampaignAsset[]> {
  return fetchJSON<CampaignAsset[]>(`/campaigns/${campaignId}/assets`)
}

export async function fetchAssetControls(assetId: string): Promise<Control[]> {
  return fetchJSON<Control[]>(`/assets/${assetId}/controls`)
}

export async function fetchAgents(): Promise<AgentDef[]> {
  return fetchJSON<AgentDef[]>("/agents")
}

export async function runPipeline(assetId?: string, agentic: boolean = false) {
  const res = await fetch(`${API_BASE}/pipeline/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId, agentic }),
  })
  return res.json()
}

// ── Formatting utilities ──

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 1_000_000_000) + " Md\u20AC"
  }
  if (value >= 1_000_000) {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 1_000_000) + " M\u20AC"
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatAUM(value: number, currency: string = "EUR"): string {
  return formatCurrency(value)
}

export function getCampaignStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    in_progress: "En cours",
    completed: "Termine",
    validated: "Valide",
  }
  return labels[status] || status
}

export function getCampaignStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    in_progress: "bg-accent/10 text-accent border-accent/20",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    validated: "bg-emerald-100 text-emerald-700 border-emerald-200",
  }
  return colors[status] || ""
}
