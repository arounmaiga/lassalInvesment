"use client"

import { useState, useEffect } from "react"
import { Plus, Building2, CheckCircle2, AlertTriangle, XCircle, Clock, TrendingUp, Filter, Search, Bot, Eye, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  campaigns as defaultCampaigns,
  funds as defaultFunds,
  formatAUM,
  getCampaignStatusLabel,
  getCampaignStatusColor,
  type Campaign,
  type Fund,
} from "@/lib/campaign-data"
import type { AppView } from "@/app/page"

interface DashboardViewProps {
  onNavigate: (view: AppView, params?: { campaignId?: string }) => void
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(defaultCampaigns)
  const [funds, setFunds] = useState<Fund[]>(defaultFunds)
  const [filterFund, setFilterFund] = useState<string>("all")
  const [filterYear, setFilterYear] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetch("http://localhost:8000/api/campaigns")
      .then((r) => r.json())
      .then((data) => { if (data && data.length) setCampaigns(data) })
      .catch(() => {})
    fetch("http://localhost:8000/api/funds")
      .then((r) => r.json())
      .then((data) => { if (data && data.length) setFunds(data) })
      .catch(() => {})
  }, [])

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterFund !== "all" && c.fundId !== filterFund) return false
    if (filterYear !== "all" && c.year.toString() !== filterYear) return false
    if (filterStatus !== "all" && c.status !== filterStatus) return false
    if (searchQuery && !c.fundName.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Stats
  const totalCampaigns = campaigns.length
  const inProgressCampaigns = campaigns.filter((c) => c.status === "in_progress").length
  const completedCampaigns = campaigns.filter((c) => c.status === "completed" || c.status === "validated").length
  const totalAUM = campaigns.reduce((sum, c) => sum + c.totalAUM, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onNavigate("landing")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Fund Control</h1>
              <p className="text-sm text-muted-foreground">Quarterly control campaigns</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onNavigate("agent-supervision")} className="gap-2">
              <Bot className="h-4 w-4" />
              AI Agents
            </Button>
            <Button variant="outline" onClick={() => onNavigate("agent-observatory")} className="gap-2">
              <Eye className="h-4 w-4" />
              Observability
            </Button>
            <Button onClick={() => onNavigate("create-campaign")} className="gap-2">
              <Plus className="h-4 w-4" />
              New campaign
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total campaigns</p>
                  <p className="text-2xl font-semibold">{totalCampaigns}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In progress</p>
                  <p className="text-2xl font-semibold text-accent">{inProgressCampaigns}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-semibold text-emerald-600">{completedCampaigns}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total AUM</p>
                  <p className="text-2xl font-semibold">{formatAUM(totalAUM)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filters</span>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search funds..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterFund} onValueChange={setFilterFund}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All funds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All funds</SelectItem>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="validated">Validated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Campaign history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Fund
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Assets
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Controls
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    AUM
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCampaigns.map((campaign) => (
                  <CampaignRow
                    key={campaign.id}
                    campaign={campaign}
                    onClick={() => onNavigate("campaign-detail", { campaignId: campaign.id })}
                  />
                ))}
              </tbody>
            </table>
            {filteredCampaigns.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                No campaigns found
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function CampaignRow({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const progressPct = Math.round(
    ((campaign.controlsPassed + campaign.controlsError + campaign.controlsWarning) / campaign.controlsTotal) * 100
  )

  return (
    <tr
      className="hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-foreground">{campaign.fundCode}</p>
          <p className="text-xs text-muted-foreground">{campaign.fundName}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-medium">{campaign.quarter} {campaign.year}</span>
      </td>
      <td className="px-4 py-3">
        <Badge className={cn("font-normal", getCampaignStatusColor(campaign.status))}>
          {getCampaignStatusLabel(campaign.status)}
        </Badge>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm">{campaign.assetsCount}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {campaign.controlsPassed}
            </span>
            {campaign.controlsWarning > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {campaign.controlsWarning}
              </span>
            )}
            {campaign.controlsError > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="h-3.5 w-3.5" />
                {campaign.controlsError}
              </span>
            )}
          </div>
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-8">{progressPct}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium">{formatAUM(campaign.totalAUM)}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-xs text-muted-foreground">
          {new Date(campaign.updatedAt).toLocaleDateString("en-US")}
        </span>
      </td>
    </tr>
  )
}
