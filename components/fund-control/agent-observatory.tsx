"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft, Bot, MessageSquare, Wrench, Clock, Zap, Eye,
  ChevronRight, CheckCircle2, XCircle, AlertTriangle, History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { campaignAssets, type CampaignAsset } from "@/lib/campaign-data"
import type { AppView } from "@/app/page"

interface AgentObservatoryProps {
  onNavigate: (view: AppView, params?: { campaignId?: string; assetId?: string }) => void
  assetId?: string
}

interface ControlRun {
  runId: string
  runNumber: number
  status: string
  startedAt: string
  completedAt: string | null
  totalTokens: number
  totalMessages: number
  totalFindings: number
  trigger: string
}

interface PhaseMessage {
  sequence: number
  controlPhase: string
  fromAgent: string
  toAgent: string
  messageType: string
  content: string
  toolsUsed: string[]
  reasoning: string | null
  tokensInput: number
  tokensOutput: number
  durationMs: number
  timestamp: string
}

interface RunMessages {
  runId: string
  phases: Record<string, PhaseMessage[]>
  totalMessages: number
}

const FIXED_PHASES = ["init", "extraction", "review", "audit", "report"]

const PHASE_LABELS: Record<string, string> = {
  init: "Initialization",
  extraction: "Data extraction",
  review: "Supervisor review",
  audit: "Audit trail",
  report: "Executive summary",
}

const AGENT_LABELS: Record<string, string> = {
  "Supervisor": "Supervisor",
  "Extraction": "Extraction",
  "Analyst": "Analyst",
  "Audit Trail": "Audit Trail",
}

const MSG_TYPE_LABELS: Record<string, string> = {
  task_assignment: "Task",
  result: "Result",
  data_delivery: "Data",
  question: "Question",
  escalation: "Escalation",
}

const MSG_TYPE_COLORS: Record<string, string> = {
  task_assignment: "bg-blue-100 text-blue-700",
  result: "bg-emerald-100 text-emerald-700",
  data_delivery: "bg-purple-100 text-purple-700",
  question: "bg-amber-100 text-amber-700",
  escalation: "bg-red-100 text-red-700",
}

const PHASE_COLORS: Record<string, string> = {
  init: "border-l-blue-400",
  extraction: "border-l-purple-400",
  C1: "border-l-emerald-400",
  C2: "border-l-amber-400",
  C3: "border-l-red-400",
  review: "border-l-blue-400",
  audit: "border-l-emerald-400",
  report: "border-l-cyan-400",
}

function getPhaseStatus(msgs: PhaseMessage[]): string {
  const resultMsg = msgs.find((m) => m.messageType === "result")
  if (!resultMsg) return "neutral"
  const c = resultMsg.content.toLowerCase()
  if (c.includes("fail") || c.includes("ecart") || c.includes("error")) return "error"
  if (c.includes("warning") || c.includes("attention")) return "warning"
  if (c.includes("pass") || c.includes("exact") || c.includes("aucun")) return "passed"
  return "neutral"
}

export function AgentObservatory({ onNavigate, assetId }: AgentObservatoryProps) {
  const [selectedAsset, setSelectedAsset] = useState<CampaignAsset | null>(
    assetId ? campaignAssets.find((a) => a.id === assetId) || campaignAssets[0] : campaignAssets[0]
  )
  const [runs, setRuns] = useState<ControlRun[]>([])
  const [selectedRun, setSelectedRun] = useState<ControlRun | null>(null)
  const [runMessages, setRunMessages] = useState<RunMessages | null>(null)
  const [selectedMsg, setSelectedMsg] = useState<PhaseMessage | null>(null)
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(FIXED_PHASES))

  useEffect(() => {
    if (!selectedAsset) return
    fetch(`http://localhost:8000/api/assets/${selectedAsset.id}/runs`)
      .then((r) => r.json())
      .then((data: ControlRun[]) => {
        setRuns(data)
        if (data.length > 0) setSelectedRun(data[0])
        else setSelectedRun(null)
      })
      .catch(() => setRuns([]))
  }, [selectedAsset])

  useEffect(() => {
    if (!selectedRun) { setRunMessages(null); return }
    fetch(`http://localhost:8000/api/runs/${selectedRun.runId}/messages`)
      .then((r) => r.json())
      .then((data: RunMessages) => { setRunMessages(data); setSelectedMsg(null) })
      .catch(() => setRunMessages(null))
  }, [selectedRun])

  const togglePhase = (phase: string) => {
    const next = new Set(expandedPhases)
    if (next.has(phase)) next.delete(phase); else next.add(phase)
    setExpandedPhases(next)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card">
        <div className="flex h-full items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Execution observability</h1>
              <p className="text-sm text-muted-foreground">Inter-agent communication grouped by control</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Active:</span>
            <select
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium"
              value={selectedAsset?.id || ""}
              onChange={(e) => {
                const a = campaignAssets.find((x) => x.id === e.target.value)
                if (a) setSelectedAsset(a)
              }}
            >
              {campaignAssets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {a.location}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">

        {/* ═══ PANEL 1 — Run history (left) ═══ */}
        <aside className="w-72 border-r border-border bg-sidebar overflow-y-auto shrink-0">
          <div className="p-3 border-b border-sidebar-border">
            <h2 className="text-xs font-semibold text-sidebar-foreground flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              History
            </h2>
          </div>

          {runs.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground">
              No executions.<br />Run controls from the campaign.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {runs.map((run) => (
                <button
                  key={run.runId}
                  onClick={() => setSelectedRun(run)}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-2.5 transition-colors",
                    selectedRun?.runId === run.runId
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold">Run #{run.runNumber}</span>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded",
                      run.totalFindings > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                      {run.totalFindings > 0 ? `${run.totalFindings} gap${run.totalFindings > 1 ? "s" : ""}` : "OK"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(run.startedAt).toLocaleDateString("en-US")}{" a "}
                    {new Date(run.startedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {run.totalMessages} messages {run.trigger === "re-run" ? "· Re-run" : "· Initial"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ═══ PANEL 2 — Execution phases (center) ═══ */}
        <div className="flex-1 border-r border-border overflow-y-auto">
          {!selectedRun || !runMessages ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              {!selectedRun ? "Select a run" : "Loading..."}
            </div>
          ) : (
            <div className="px-3 py-3">
              {/* Run header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Run #{selectedRun.runNumber}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedRun.startedAt).toLocaleDateString("en-US")} a{" "}
                    {new Date(selectedRun.startedAt).toLocaleTimeString("en-US")}
                    {" · "}{runMessages.totalMessages} messages
                    {" · "}{selectedRun.totalFindings} finding{selectedRun.totalFindings !== 1 ? "s" : ""}
                  </p>
                </div>
                <Badge className={cn("py-1 px-2 text-xs",
                  selectedRun.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}>
                  {selectedRun.status === "completed" ? "Completed" : selectedRun.status}
                </Badge>
              </div>

              {/* Phase list — dynamic: fixed phases + any control codes from data */}
              <div className="space-y-1.5">
                {(() => {
                  const allPhases = Object.keys(runMessages.phases)
                  const controlPhases = allPhases.filter(p => !FIXED_PHASES.includes(p)).sort()
                  const orderedPhases = [
                    ...FIXED_PHASES.filter(p => p === "init" || p === "extraction"),
                    ...controlPhases,
                    ...FIXED_PHASES.filter(p => p === "review" || p === "audit" || p === "report"),
                  ].filter(p => runMessages.phases[p])
                  return orderedPhases
                })().map((phase) => {
                  const msgs = runMessages.phases[phase]
                  const isExpanded = expandedPhases.has(phase)
                  const isControl = !FIXED_PHASES.includes(phase)
                  const status = getPhaseStatus(msgs)

                  return (
                    <div key={phase} className={cn("rounded-lg border border-border overflow-hidden border-l-4", PHASE_COLORS[phase] || (isControl ? "border-l-accent" : "border-l-muted"))}>
                      {/* Phase header */}
                      <button onClick={() => togglePhase(phase)} className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                          <span className="text-sm font-medium text-foreground">{PHASE_LABELS[phase] || `Control ${phase}`}</span>
                          <span className="text-[10px] text-muted-foreground">{msgs.length} msg{msgs.length > 1 ? "s" : ""}</span>
                        </div>
                        {isControl && status === "passed" && <Badge className="bg-emerald-100 text-emerald-700 gap-1 text-[10px] py-0.5"><CheckCircle2 className="h-3 w-3" />PASS</Badge>}
                        {isControl && status === "error" && <Badge className="bg-red-100 text-red-700 gap-1 text-[10px] py-0.5"><XCircle className="h-3 w-3" />GAP</Badge>}
                        {isControl && status === "warning" && <Badge className="bg-amber-100 text-amber-700 gap-1 text-[10px] py-0.5"><AlertTriangle className="h-3 w-3" />ATTENTION</Badge>}
                      </button>

                      {/* Messages */}
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-1">
                          {msgs.map((msg, idx) => {
                            const isSelected = selectedMsg?.sequence === msg.sequence
                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedMsg(isSelected ? null : msg)}
                                className={cn(
                                  "w-full text-left rounded-md px-3 py-2 text-xs transition-colors",
                                  isSelected ? "bg-accent/10 ring-1 ring-accent/30" : "hover:bg-muted/30"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{AGENT_LABELS[msg.fromAgent] || msg.fromAgent}</span>
                                  <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                                  <span className="text-muted-foreground">{AGENT_LABELS[msg.toAgent] || msg.toAgent}</span>
                                  <Badge className={cn("text-[9px] ml-auto py-0", MSG_TYPE_COLORS[msg.messageType])}>
                                    {MSG_TYPE_LABELS[msg.messageType]}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground mt-0.5 line-clamp-1">{msg.content.substring(0, 100)}</p>
                                {msg.toolsUsed?.length > 0 && (
                                  <div className="flex items-center gap-1 mt-0.5 text-[9px] text-muted-foreground">
                                    <Wrench className="h-2.5 w-2.5" />{msg.toolsUsed.join(", ")}
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ═══ PANEL 3 — Message detail (right) ═══ */}
        <aside className="w-[420px] overflow-y-auto shrink-0 bg-card">
          {!selectedMsg ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-6 text-center">
              <MessageSquare className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm">Click on a message to view details</p>
              <p className="text-xs mt-1">Full content, tools called, and agent reasoning</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* From / To */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{AGENT_LABELS[selectedMsg.fromAgent] || selectedMsg.fromAgent}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>to</span>
                  <span className="font-medium">{AGENT_LABELS[selectedMsg.toAgent] || selectedMsg.toAgent}</span>
                  <Badge className={cn("text-[9px] ml-2", MSG_TYPE_COLORS[selectedMsg.messageType])}>
                    {MSG_TYPE_LABELS[selectedMsg.messageType]}
                  </Badge>
                </div>
                {selectedMsg.controlPhase && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Phase: <span className="font-medium">{PHASE_LABELS[selectedMsg.controlPhase] || selectedMsg.controlPhase}</span>
                  </p>
                )}
              </div>

              {/* Content */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Message content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedMsg.content}
                  </div>
                </CardContent>
              </Card>

              {/* Tools */}
              {selectedMsg.toolsUsed && selectedMsg.toolsUsed.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5" />
                      Tools called ({selectedMsg.toolsUsed.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {selectedMsg.toolsUsed.map((tool, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 font-mono text-xs">
                        <Zap className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span>{tool}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Reasoning / Tool trace */}
              {selectedMsg.reasoning && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-primary uppercase tracking-wider flex items-center gap-2">
                      <Bot className="h-3.5 w-3.5" />
                      Execution trace (audit trail)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-foreground leading-relaxed font-mono whitespace-pre-wrap bg-muted/30 rounded p-3">
                      {selectedMsg.reasoning}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              {(selectedMsg.tokensInput + selectedMsg.tokensOutput > 0 || selectedMsg.durationMs > 0) && (
                <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
                  {selectedMsg.tokensInput + selectedMsg.tokensOutput > 0 && (
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {(selectedMsg.tokensInput + selectedMsg.tokensOutput).toLocaleString("en-US")} tokens
                    </span>
                  )}
                  {selectedMsg.durationMs > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedMsg.durationMs}ms
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
