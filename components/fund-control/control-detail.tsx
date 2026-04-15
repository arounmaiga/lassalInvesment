"use client"

import { cn } from "@/lib/utils"
import {
  Bot,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  MessageSquare,
  Mail,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import type { Control, ControlStatus } from "@/lib/fund-control-data"
import { formatCurrency } from "@/lib/fund-control-data"

interface ControlDetailProps {
  control: Control
  liveSteps?: any[]
  assetId?: string
  onRerun?: (code: string) => void
}

const AGENT_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  "Extraction": { bg: "bg-purple-50", text: "text-purple-700", icon: "bg-purple-500" },
  "Analyst": { bg: "bg-blue-50", text: "text-blue-700", icon: "bg-blue-500" },
  "Audit Trail": { bg: "bg-emerald-50", text: "text-emerald-700", icon: "bg-emerald-500" },
  "Supervisor": { bg: "bg-amber-50", text: "text-amber-700", icon: "bg-amber-500" },
}
const DEFAULT_STYLE = { bg: "bg-muted/50", text: "text-muted-foreground", icon: "bg-muted-foreground" }

function getStatusBadge(status: ControlStatus, gap?: { amount: number; percentage: number }) {
  switch (status) {
    case "passed":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5 py-1.5 px-3">
          <CheckCircle2 className="h-4 w-4" />
          PASS
        </Badge>
      )
    case "error":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 gap-1.5 py-1.5 px-3">
          <XCircle className="h-4 w-4" />
          GAP DETECTED {gap ? `- ${formatCurrency(gap.amount)}` : ""}
        </Badge>
      )
    case "warning":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5 py-1.5 px-3">
          <AlertTriangle className="h-4 w-4" />
          ATTENTION {gap ? `- ${formatCurrency(gap.amount)}` : ""}
        </Badge>
      )
    case "pending":
      return (
        <Badge className="bg-accent/10 text-accent border-accent/20 gap-1.5 py-1.5 px-3 animate-pulse">
          <Clock className="h-4 w-4" />
          IN PROGRESS
        </Badge>
      )
    case "not_done":
    default:
      return (
        <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
          NOT RUN
        </Badge>
      )
  }
}

function SourceIcon({ type }: { type: "pdf" | "excel" }) {
  if (type === "pdf") return <FileText className="h-4 w-4 text-rose-600" />
  return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/** Strip markdown artifacts from agent text (**, ##, etc.) */
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/^---+$/gm, "")
    .replace(/^\s*\n/gm, "\n")
    .trim()
}

function AIControlDetail({ control, liveSteps, assetId, onRerun }: { control: Control; liveSteps?: any[]; assetId?: string; onRerun?: (code: string) => void }) {
  const details = control.details!
  // Parsed control steps (structured table) or legacy agent steps
  const controlSteps = details.controlSteps || []
  const isStreaming = !!liveSteps
  const [fileDetail, setFileDetail] = useState<{ name: string; type: string; summary?: string; keyFigures?: any } | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  const toggleStep = (n: number) => {
    const next = new Set(expandedSteps)
    if (next.has(n)) next.delete(n); else next.add(n)
    setExpandedSteps(next)
  }

  return (
    <div className="space-y-4">
      {/* Control Summary — compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-muted-foreground">{control.code}</span>
          <h2 className="text-lg font-semibold">{control.name}</h2>
          {getStatusBadge(control.status, control.gap)}
        </div>
        {control.lastExecution && (
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{control.lastExecution}</span>
        )}
      </div>

      {/* Supervisor Conclusion — expandable */}
      {details.agentComment && (() => {
        const cleaned = cleanMarkdown(details.agentComment)
        const isLong = cleaned.length > 200
        return (
          <div className="rounded-lg border border-primary/20 bg-primary/5">
            <button
              onClick={() => setExpandedSteps(prev => {
                const next = new Set(prev)
                if (next.has(-1)) next.delete(-1); else next.add(-1)
                return next
              })}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-primary/10 transition-colors rounded-lg"
            >
              <Bot className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-primary">Conclusion</span>
                <p className={cn("text-[13px] text-foreground mt-0.5 leading-relaxed", !expandedSteps.has(-1) && "line-clamp-2")}>
                  {cleaned}
                </p>
              </div>
              {isLong && (
                expandedSteps.has(-1)
                  ? <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0 mt-1" />
                  : <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-1" />
              )}
            </button>
          </div>
        )
      })()}

      {/* Control Steps — structured table */}
      {controlSteps.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Control steps ({controlSteps.length})
              {details.confidence && (
                <span className={cn("text-xs font-semibold ml-auto", details.confidence >= 80 ? "text-emerald-600" : details.confidence >= 50 ? "text-amber-600" : "text-red-600")}>
                  Overall confidence: {details.confidence}%
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table header */}
            <div className="grid grid-cols-[28px_1fr_120px_70px] gap-2 px-4 py-2 bg-muted/30 border-y border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <div>#</div>
              <div>Check</div>
              <div>Finding</div>
              <div className="text-center">Result</div>
            </div>
            {/* Rows */}
            {controlSteps.map((step: any, idx: number) => {
              const isExpanded = expandedSteps.has(idx)
              return (
                <div key={idx} className="border-b border-border last:border-b-0">
                  <button
                    onClick={() => toggleStep(idx)}
                    className="w-full grid grid-cols-[28px_1fr_120px_70px] gap-2 px-4 py-2.5 hover:bg-muted/10 transition-colors text-left items-center"
                  >
                    <span className="text-[11px] font-mono text-muted-foreground">{idx + 1}</span>
                    <span className="text-[12px] text-foreground truncate">{step.check || "—"}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{step.found || "—"}</span>
                    <span className={cn("text-[10px] font-bold text-center",
                      step.result === "PASS" ? "text-emerald-600" :
                      step.result === "FAIL" ? "text-red-600" :
                      step.result === "WARNING" ? "text-amber-600" : "text-muted-foreground"
                    )}>{step.result || "—"}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 pl-10 space-y-1">
                      {step.source && <p className="text-[11px] text-muted-foreground"><span className="font-medium">Source:</span> {step.source}</p>}
                      {step.found && <p className="text-[11px] text-foreground"><span className="font-medium text-muted-foreground">Found:</span> {step.found}</p>}
                      {step.evidence && <p className="text-[12px] text-foreground bg-muted/10 rounded p-2">{step.evidence}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Full analysis (expandable) */}
      {details.fullAnalysis && (
        <button
          onClick={() => setExpandedSteps(prev => { const n = new Set(prev); if (n.has(-2)) n.delete(-2); else n.add(-2); return n })}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {expandedSteps.has(-2) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Full agent response ({details.tokensInput ? `${(details.tokensInput + details.tokensOutput).toLocaleString("en-US")} tokens` : ""} {details.durationMs ? `${(details.durationMs/1000).toFixed(1)}s` : ""})
        </button>
      )}
      {expandedSteps.has(-2) && details.fullAnalysis && (
        <div className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap bg-muted/10 rounded-lg p-4">
          {cleanMarkdown(details.fullAnalysis)}
        </div>
      )}

      {/* Sources — click to see analysis */}
      {details.sources && details.sources.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Data sources
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {details.sources.map((source: any, index: number) => (
                <div key={index} className="inline-flex items-center gap-1">
                  <button
                    onClick={() => {
                      // Fetch file analysis from API
                      fetch(`${API}/api/assets/${assetId || "unknown"}/documents`)
                        .then(r => r.json())
                        .then((docs: any[]) => {
                          const doc = docs.find((d: any) => d.filename === source.name)
                          setFileDetail({
                            name: source.name,
                            type: source.type,
                            summary: doc?.summary,
                            keyFigures: doc?.keyFigures,
                          })
                        })
                        .catch(() => setFileDetail({ name: source.name, type: source.type, summary: "Analysis not available" }))
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm cursor-pointer"
                  >
                    <SourceIcon type={source.type} />
                    <span>{source.name}</span>
                    <Bot className="h-3 w-3 text-accent" />
                  </button>
                  <a
                    href={source.url ? `${API}${source.url}` : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                    title="Download file"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Validate control
            </Button>
            <Button variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Request correction
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => onRerun?.(control.code)} disabled={!onRerun}>
              <RotateCcw className="h-4 w-4" />
              Re-run control
            </Button>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Fund Controller comment
            </label>
            <Textarea placeholder="Add your observations..." className="min-h-[80px] resize-none" />
          </div>
        </CardContent>
      </Card>

      {/* File analysis popup */}
      {fileDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => setFileDetail(null)}>
          <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20 shrink-0">
              <div className="flex items-center gap-3">
                <SourceIcon type={fileDetail.type as "pdf" | "excel"} />
                <div>
                  <h3 className="text-base font-semibold text-foreground">{fileDetail.name}</h3>
                  <span className="text-xs text-muted-foreground">AI document analysis</span>
                </div>
              </div>
              <button onClick={() => setFileDetail(null)} className="px-3 py-1.5 rounded-lg hover:bg-muted text-sm text-muted-foreground">Close</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {fileDetail.keyFigures && Object.keys(fileDetail.keyFigures).length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key figures</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(fileDetail.keyFigures).map(([k, v]: [string, any]) => (
                      <div key={k} className="px-3 py-1.5 rounded-lg bg-muted/50 text-sm">
                        <span className="text-muted-foreground">{k}: </span>
                        <span className="font-semibold">{typeof v === "number" && v > 1000 ? `${(v/1000000).toFixed(1)} M EUR` : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold">Document analysis</span>
              </div>
              {fileDetail.summary ? (
                <div className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                  {cleanMarkdown(fileDetail.summary)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No analysis available for this file.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ManualControlDetail({ control }: { control: Control }) {
  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-muted-foreground">{control.code}</span>
              <CardTitle className="text-xl">{control.name}</CardTitle>
            </div>
            {getStatusBadge(control.status)}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{control.description}</p>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80">
              This control is not yet automated. Perform the verifications manually.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Mark as completed
          </Button>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Notes and observations
            </label>
            <Textarea placeholder="Document your verifications..." className="min-h-[100px] resize-none" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ControlDetail({ control, liveSteps, assetId, onRerun }: ControlDetailProps) {
  // AI control with results or live streaming
  if (control.type === "ai" && (control.details || liveSteps)) {
    return <AIControlDetail control={{ ...control, details: control.details || { agentComment: "", sources: [] } }} liveSteps={liveSteps} assetId={assetId} onRerun={onRerun} />
  }
  // AI control not yet executed
  if (control.type === "ai") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-muted-foreground">{control.code}</span>
            <h2 className="text-lg font-semibold">{control.name}</h2>
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3">NOT RUN</Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{control.description}</p>
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-5 text-center">
          <Bot className="h-8 w-8 text-accent mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium text-foreground mb-1">Automated control ready to run</p>
          <p className="text-xs text-muted-foreground">Click the ▸ button next to the control or &quot;Run all&quot; to launch the agent analysis.</p>
        </div>
      </div>
    )
  }
  // Manual control
  return <ManualControlDetail control={control} />
}
