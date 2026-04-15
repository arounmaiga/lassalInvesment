"use client"

import {
  Building2, Bot, FileSearch, ArrowRight, Settings,
  Upload, Play, Eye, CheckCircle2, RefreshCw, Database,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { AppView } from "@/app/page"

interface LandingPageProps {
  onNavigate: (view: AppView) => void
}

const WORKFLOW_STEPS = [
  {
    num: "1",
    title: "Configure the repository",
    desc: "The administrator creates investment funds and registers their real estate assets (name, city, type, area). This configuration is done once.",
    icon: Database,
    color: "bg-blue-100 text-blue-700",
    action: "admin" as AppView,
    actionLabel: "Administration",
  },
  {
    num: "2",
    title: "Create the quarterly campaign",
    desc: "The Fund Controller creates a control campaign by selecting a fund and a period (Q1-Q4). The fund's assets are automatically linked to the campaign.",
    icon: Building2,
    color: "bg-purple-100 text-purple-700",
    action: "create-campaign" as AppView,
    actionLabel: "New campaign",
  },
  {
    num: "3",
    title: "Upload source documents",
    desc: "For each asset, the FC uploads the 5 quarterly source documents: expert valuation report (PDF), Yardi Balance Sheet extraction (Excel), Yardi P&L extraction (Excel), Asset Manager CAPEX tracker (Excel), and rental schedule (Excel).",
    icon: Upload,
    color: "bg-amber-100 text-amber-700",
    action: null,
    actionLabel: "",
  },
  {
    num: "4",
    title: "Run AI controls",
    desc: "4 specialized AI agents (Supervisor, Extraction, Analyst, Audit Trail) automatically execute the controls defined by the Fund Controller. The Analyst agent has 12 tools (variance calculation, ratios, reconciliation, outlier detection...) and produces textual analyses citing source files.",
    icon: Play,
    color: "bg-emerald-100 text-emerald-700",
    action: "agent-supervision" as AppView,
    actionLabel: "View agents",
  },
  {
    num: "5",
    title: "Analyze and trace",
    desc: "The FC reviews results per asset: reconciliation table, detected gaps with amounts and percentages, agent analysis in business language, clickable data sources (PDF page, Yardi line). Each finding is traced back to its source. Observability shows the complete inter-agent communication.",
    icon: Eye,
    color: "bg-cyan-100 text-cyan-700",
    action: "dashboard" as AppView,
    actionLabel: "View campaigns",
  },
  {
    num: "6",
    title: "Correct and re-run",
    desc: "If a gap is detected, the FC requests correction from the accountant or Asset Manager, re-uploads the corrected file (v2), and re-runs the relevant control. The complete execution history is preserved for audit (run #1, run #2...).",
    icon: RefreshCw,
    color: "bg-red-100 text-red-700",
    action: null,
    actionLabel: "",
  },
]

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">LaSalle Investment Management</h1>
              <p className="text-xs text-muted-foreground">JLL subsidiary &middot; EUR 70 Bn under management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={() => onNavigate("admin")}>
              <Settings className="h-4 w-4" />
              Administration
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => onNavigate("control-designer")}>
              <FileSearch className="h-4 w-4" />
              Controls
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => onNavigate("agent-supervision")}>
              <Bot className="h-4 w-4" />
              AI Agents
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="px-8 py-12 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-5">
          <Bot className="h-4 w-4" />
          Powered by multi-agent AI
        </div>
        <h2 className="text-4xl font-bold text-foreground mb-3">AI Fund Control</h2>
        <p className="text-lg text-muted-foreground mb-2 max-w-2xl mx-auto">
          Fair Value control automation for real estate assets
        </p>
        <p className="text-sm text-muted-foreground mb-8 max-w-2xl mx-auto">
          6 specialized AI agents analyze your expert reports, Yardi extractions,
          and financial trackers to automatically detect valuation gaps.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button size="lg" className="gap-2 text-base px-8" onClick={() => onNavigate("dashboard")}>
            <FileSearch className="h-5 w-5" />
            Go to campaigns
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Workflow */}
      <div className="px-8 pb-8 max-w-5xl mx-auto">
        <h3 className="text-lg font-semibold text-foreground mb-5 text-center">Operating procedure</h3>
        <div className="grid grid-cols-3 gap-4">
          {WORKFLOW_STEPS.map((step) => (
            <Card key={step.num} className="border-border relative">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${step.color} shrink-0`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">STEP {step.num}</span>
                    </div>
                    <h4 className="font-semibold text-foreground text-sm">{step.title}</h4>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                {step.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 gap-1 text-xs text-accent h-7 px-2"
                    onClick={() => onNavigate(step.action!)}
                  >
                    {step.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t px-8 py-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>LaSalle Investment Management &middot; JLL subsidiary</span>
          <span>POC AI Fund Control &middot; Softeam AI Lab &middot; 2026</span>
        </div>
      </footer>
    </div>
  )
}
