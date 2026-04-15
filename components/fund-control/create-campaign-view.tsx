"use client"

import { useState } from "react"
import { ArrowLeft, Building2, Calendar, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { funds, quarters, years, formatAUM } from "@/lib/campaign-data"
import type { AppView } from "@/app/page"

interface CreateCampaignViewProps {
  onNavigate: (view: AppView, params?: { campaignId?: string }) => void
}

export function CreateCampaignView({ onNavigate }: CreateCampaignViewProps) {
  const [selectedFund, setSelectedFund] = useState<string>("")
  const [selectedQuarter, setSelectedQuarter] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<string>("2025")
  const [isCreating, setIsCreating] = useState(false)

  const selectedFundData = funds.find((f) => f.id === selectedFund)
  const canCreate = selectedFund && selectedQuarter && selectedYear

  const handleCreate = async () => {
    if (!canCreate) return
    setIsCreating(true)
    try {
      const res = await fetch("http://localhost:8000/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fundId: selectedFund, quarter: selectedQuarter, year: parseInt(selectedYear) }),
      })
      const data = await res.json()
      onNavigate("campaign-detail", { campaignId: data.id })
    } catch (e) {
      console.error("Campaign creation failed:", e)
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center gap-4 px-6 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("dashboard")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">New control campaign</h1>
            <p className="text-sm text-muted-foreground">
              Select a fund and period to get started
            </p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        <div className="space-y-6">
          {/* Fund Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Fund selection
              </CardTitle>
              <CardDescription>
                Choose the fund for which you want to launch a control campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {funds.map((fund) => (
                  <button
                    key={fund.id}
                    onClick={() => setSelectedFund(fund.id)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border text-left transition-all",
                      selectedFund === fund.id
                        ? "border-accent bg-accent/5 ring-1 ring-accent"
                        : "border-border hover:border-accent/50 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          selectedFund === fund.id ? "bg-accent text-white" : "bg-muted"
                        )}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{fund.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {fund.code} - {fund.assetsCount} assets
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatAUM(fund.aum, fund.currency)}</p>
                      <p className="text-xs text-muted-foreground">AUM</p>
                    </div>
                    {selectedFund === fund.id && (
                      <CheckCircle2 className="h-5 w-5 text-accent ml-4" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Period Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Control period
              </CardTitle>
              <CardDescription>
                Select the quarter and year for the campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quarter</Label>
                  <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {quarters.map((q) => (
                        <SelectItem key={q.value} value={q.value}>
                          {q.label} ({q.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {canCreate && selectedFundData && (
            <Card className="border-accent/30 bg-accent/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Campaign to create</p>
                    <p className="font-semibold text-lg">
                      {selectedFundData.code} - {selectedQuarter} {selectedYear}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedFundData.assetsCount} assets - {selectedFundData.assetsCount * 20} controls to perform
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Create campaign
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
