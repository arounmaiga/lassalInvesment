import type { ControlStatus } from "./fund-control-data"

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
  status: ControlStatus
}

// Available funds
export let funds: Fund[] = [
  { id: "f1", name: "LaSalle E-REGI Fund II", code: "EREGI2", aum: 206600000, assetsCount: 5, currency: "EUR" },
  { id: "f2", name: "LaSalle Income & Growth VII", code: "LIG7", aum: 1850000000, assetsCount: 8, currency: "EUR" },
  { id: "f3", name: "Pan-European Core Fund", code: "PECF", aum: 3200000000, assetsCount: 18, currency: "EUR" },
]

// Load funds from API
if (typeof window !== "undefined") {
  fetch("http://localhost:8000/api/funds")
    .then((r) => r.json())
    .then((data) => { if (data && data.length) funds = data })
    .catch(() => {})
}

// Available quarters
export const quarters = [
  { value: "Q1", label: "Q1" },
  { value: "Q2", label: "Q2" },
  { value: "Q3", label: "Q3" },
  { value: "Q4", label: "Q4" },
]

export const years = [2026, 2025, 2024, 2023]

// Historical campaigns — loaded from Supabase via API, fallback data below
export let campaigns: Campaign[] = []

// Fetch from API on load
if (typeof window !== "undefined") {
  fetch("http://localhost:8000/api/campaigns")
    .then((r) => r.json())
    .then((data) => { campaigns = data })
    .catch(() => {})
}

// SSR fallback (will be replaced by API data on client)
campaigns = [
  {
    id: "camp1",
    fundId: "eregi2",
    fundName: "LaSalle E-REGI Fund II",
    fundCode: "EREGI2",
    quarter: "Q4",
    year: 2025,
    status: "in_progress",
    createdAt: "2026-01-15",
    updatedAt: "2026-03-21",
    assetsCount: 5,
    controlsTotal: 100,
    controlsPassed: 12,
    controlsError: 3,
    controlsWarning: 1,
    controlsPending: 84,
    totalAUM: 206600000,
  },
  {
    id: "camp2",
    fundId: "eregi2",
    fundName: "LaSalle E-REGI Fund II",
    fundCode: "EREGI2",
    quarter: "Q3",
    year: 2025,
    status: "validated",
    createdAt: "2025-10-05",
    updatedAt: "2025-11-12",
    completedAt: "2025-11-12",
    assetsCount: 5,
    controlsTotal: 100,
    controlsPassed: 15,
    controlsError: 0,
    controlsWarning: 0,
    controlsPending: 85,
    totalAUM: 204200000,
    validatedBy: "Anna Bergmann",
  },
]

// Assets for the current campaign (EREGI2 Q4 2025) — from Supabase
export let campaignAssets: CampaignAsset[] = []

if (typeof window !== "undefined") {
  fetch("http://localhost:8000/api/campaigns/camp1/assets")
    .then((r) => r.json())
    .then((data) => { campaignAssets = data })
    .catch(() => {})
}

// SSR fallback
campaignAssets = [
  { id: "TL001", name: "Tour Lumiere", location: "Paris 13", expertValue: 42500000, comptaValue: 42500000, controlsTotal: 20, controlsPassed: 3, controlsError: 0, controlsWarning: 0, status: "passed" },
  { id: "CB002", name: "Citygate Business", location: "Munich", expertValue: 28100000, comptaValue: 28100000, controlsTotal: 20, controlsPassed: 2, controlsError: 0, controlsWarning: 1, status: "warning" },
  { id: "WP003", name: "Westpark Plaza", location: "Frankfurt", expertValue: 65300000, comptaValue: 65300000, controlsTotal: 20, controlsPassed: 1, controlsError: 2, controlsWarning: 0, status: "error" },
  { id: "PM004", name: "Parc du Millenaire", location: "Paris 19", expertValue: 51000000, comptaValue: 51000000, controlsTotal: 20, controlsPassed: 3, controlsError: 0, controlsWarning: 0, status: "passed" },
  { id: "AL005", name: "Alsterpark Logistik", location: "Hamburg", expertValue: 19700000, comptaValue: 18300000, controlsTotal: 20, controlsPassed: 2, controlsError: 1, controlsWarning: 0, status: "error" },
  { id: "MR006", name: "Marais Royal", location: "Paris 4e", expertValue: 91700000, comptaValue: 91700000, controlsTotal: 6, controlsPassed: 0, controlsError: 0, controlsWarning: 0, status: "not_done" },
]

export function getCampaignStatusLabel(status: Campaign["status"]): string {
  switch (status) {
    case "draft": return "Draft"
    case "in_progress": return "In progress"
    case "completed": return "Completed"
    case "validated": return "Validated"
  }
}

export function getCampaignStatusColor(status: Campaign["status"]): string {
  switch (status) {
    case "draft": return "bg-muted text-muted-foreground"
    case "in_progress": return "bg-accent/10 text-accent"
    case "completed": return "bg-amber-100 text-amber-700"
    case "validated": return "bg-emerald-100 text-emerald-700"
  }
}

export function formatAUM(value: number, currency: string = "EUR"): string {
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$"
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1) + " Md" + symbol
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(0) + " M" + symbol
  }
  return value.toLocaleString("fr-FR") + " " + symbol
}
