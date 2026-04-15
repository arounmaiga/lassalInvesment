"use client"

import { useState, useEffect, useRef } from "react"
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronRight,
  Play,
  Loader2,
  Eye,
  Upload,
  FileText,
  FileSpreadsheet,
  Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  campaigns,
  campaignAssets,
  formatAUM,
  getCampaignStatusLabel,
  getCampaignStatusColor,
  type CampaignAsset,
} from "@/lib/campaign-data"
import { formatCurrency } from "@/lib/fund-control-data"
import type { Control } from "@/lib/fund-control-data"
import { ChecklistSidebar } from "./checklist-sidebar"
import { ControlDetail } from "./control-detail"
import type { AppView } from "@/app/page"

function GroupConclusionView({ groupConclusion, controlGroups, groupResults, controlByCode }: {
  groupConclusion: { groupName: string; conclusion: string }
  controlGroups: any[]
  groupResults: Record<number, { status: string; conclusion: string }>
  controlByCode: Record<string, Control>
}) {
  const grp = controlGroups.find((g: any) => g.name === groupConclusion.groupName)
  const grpControls = (grp?.controls || []).map((gc: any) => controlByCode[gc.code]).filter(Boolean)
  const cleaned = groupConclusion.conclusion.replace(/\*\*/g, "").replace(/^#{1,4}\s+/gm, "")
  const grpStatus = grp ? groupResults[grp.id]?.status : null

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{groupConclusion.groupName}</h2>
        {grpStatus && (
          <Badge className={cn("py-1", grpStatus === "PASS" ? "bg-emerald-100 text-emerald-700" : grpStatus === "FAIL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{grpStatus}</Badge>
        )}
      </div>
      {grp?.objective && (
        <p className="text-sm text-muted-foreground">{grp.objective}</p>
      )}
      <div className="rounded-lg border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Group controls</p>
        <div className="space-y-2">
          {grpControls.map((ctrl: Control) => (
            <div key={ctrl.code} className="flex items-center gap-3 text-sm">
              {ctrl.status === "passed" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              {ctrl.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
              {ctrl.status === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
              {ctrl.status === "not_done" && <div className="h-4 w-4 rounded-full border border-border" />}
              <span className="font-mono text-xs text-muted-foreground">{ctrl.code}</span>
              <span className="font-medium">{ctrl.name}</span>
              <span className={cn("text-xs ml-auto", ctrl.status === "passed" ? "text-emerald-600" : ctrl.status === "error" ? "text-red-600" : ctrl.status === "warning" ? "text-amber-600" : "text-muted-foreground")}>
                {ctrl.status === "passed" ? "PASS" : ctrl.status === "error" ? "FAIL" : ctrl.status === "warning" ? "WARNING" : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <Bot className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-primary mb-2">Supervisor Summary</p>
            <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{cleaned}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CampaignDetailViewProps {
  campaignId: string
  assetId?: string
  onNavigate: (view: AppView, params?: { campaignId?: string; assetId?: string }) => void
}

export function CampaignDetailView({ campaignId, assetId, onNavigate }: CampaignDetailViewProps) {
  const campaign = campaigns.find((c) => c.id === campaignId) || campaigns[0]
  const [selectedAsset, setSelectedAsset] = useState<CampaignAsset | null>(
    assetId ? campaignAssets.find((a) => a.id === assetId) || null : null
  )
  const [controls, setControls] = useState<Control[]>([])
  const [selectedControl, setSelectedControl] = useState<Control | null>(null)
  const [controlGroups, setControlGroups] = useState<any[]>([])
  const [assetDocs, setAssetDocs] = useState<any[]>([])
  const [running, setRunning] = useState(false)
  const [runProgress, setRunProgress] = useState<{ currentControl?: string; currentStep?: number; totalSteps?: number; completedControls: string[] }>({ completedControls: [] })
  const [liveSteps, setLiveSteps] = useState<Record<string, any[]>>({})
  const [groupConclusion, setGroupConclusion] = useState<{ groupName: string; conclusion: string } | null>(null)
  const [groupResults, setGroupResults] = useState<Record<number, { status: string; conclusion: string }>>({})
  const [lastRunResult, setLastRunResult] = useState<{ totalFindings: number; controls: Record<string, string>; runNumber?: number } | null>(null)

  // Fetch controls from API when an asset is selected
  const loadControls = (assetId: string) => {
    fetch(`http://localhost:8000/api/assets/${assetId}/controls`)
      .then((r) => r.json())
      .then((data: Control[]) => {
        setControls(data)
        setSelectedControl(data[0] || null)
      })
      .catch(console.error)
  }

  const loadDocs = (assetId: string) => {
    fetch(`http://localhost:8000/api/assets/${assetId}/documents?campaign_id=${campaignId}`)
      .then(r => r.json()).then(setAssetDocs).catch(() => setAssetDocs([]))
  }

  const loadGroups = () => {
    fetch("http://localhost:8000/api/control-groups")
      .then(r => r.json()).then(setControlGroups).catch(() => setControlGroups([]))
  }

  const loadGroupResults = (assetId: string) => {
    fetch(`http://localhost:8000/api/assets/${assetId}/group-results?campaign_id=${campaignId}`)
      .then(r => r.json())
      .then((data: any[]) => {
        const map: Record<number, { status: string; conclusion: string }> = {}
        // Keep latest per group_id
        for (const r of data) {
          if (!map[r.groupId]) {
            map[r.groupId] = { status: r.status, conclusion: r.conclusion }
          }
        }
        setGroupResults(map)
      })
      .catch(() => setGroupResults({}))
  }

  useEffect(() => {
    if (selectedAsset) {
      loadControls(selectedAsset.id)
      loadDocs(selectedAsset.id)
      loadGroups()
      loadGroupResults(selectedAsset.id)
    }
  }, [selectedAsset])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // SSE helper — shared between "all", "group", and "single" execution
  const startSSE = (url: string) => {
    setRunning(true)
    setLastRunResult(null)
    setRunProgress({ completedControls: [] })
    setLiveSteps({})
    setGroupConclusion(null)

    let completed = false
    const evtSource = new EventSource(url)
    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "control_start") {
        setRunProgress(prev => ({ ...prev, currentControl: `${data.code} — ${data.name}`, currentStep: 0, totalSteps: data.totalSteps }))
        setLiveSteps(prev => ({ ...prev, [data.code]: [] }))
      } else if (data.type === "step_start") {
        setRunProgress(prev => ({ ...prev, currentControl: `${data.code} — Step ${data.stepNumber}: ${data.agent}` }))
        setLiveSteps(prev => ({ ...prev, [data.code]: [...(prev[data.code] || []), { stepNumber: data.stepNumber, agent: data.agent, action: data.action, analysis: null, confidence: null }] }))
      } else if (data.type === "step_result") {
        setLiveSteps(prev => ({ ...prev, [data.code]: (prev[data.code] || []).map(s => s.stepNumber === data.stepNumber ? { ...s, analysis: data.analysis, confidence: data.confidence } : s) }))
      } else if (data.type === "control_result") {
        setRunProgress(prev => ({ ...prev, completedControls: [...prev.completedControls, `${data.code}: ${data.severity}`] }))
      } else if (data.type === "group_conclusion_start") {
        setRunProgress(prev => ({ ...prev, currentControl: `Group summary ${data.groupName}...` }))
      } else if (data.type === "group_conclusion") {
        setGroupConclusion({ groupName: data.groupName, conclusion: data.conclusion })
      } else if (data.type === "complete") {
        completed = true
        setLastRunResult({ totalFindings: data.totalFindings, controls: data.controls || {} })
        setRunning(false)
        setLiveSteps({})
        evtSource.close()
        if (selectedAsset) { loadControls(selectedAsset.id); loadGroupResults(selectedAsset.id) }
      } else if (data.type === "error") {
        completed = true
        setRunning(false)
        evtSource.close()
      }
    }
    evtSource.onerror = () => { if (!completed) { setRunning(false) }; evtSource.close() }
  }

  // Run controls with SSE streaming
  const handleRunControls = () => {
    if (!selectedAsset || running) return
    setRunning(true)
    setLastRunResult(null)
    setRunProgress({ completedControls: [] })
    setLiveSteps({})

    const evtSource = new EventSource(
      `http://localhost:8000/api/assets/${selectedAsset.id}/rerun-stream?campaign_id=${campaignId}`
    )

    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === "control_start") {
        setRunProgress(prev => ({ ...prev, currentControl: `${data.code} — ${data.name}`, currentStep: 0, totalSteps: data.totalSteps }))
        // Add placeholder for this control
        setLiveSteps(prev => ({ ...prev, [data.code]: [] }))
      } else if (data.type === "step_start") {
        setRunProgress(prev => ({ ...prev, currentStep: data.stepNumber, currentControl: `${data.code} — Step ${data.stepNumber}: ${data.agent}` }))
        // Add "in progress" placeholder
        setLiveSteps(prev => ({
          ...prev,
          [data.code]: [...(prev[data.code] || []), { stepNumber: data.stepNumber, agent: data.agent, action: data.action, analysis: null, confidence: null }],
        }))
      } else if (data.type === "step_result") {
        // Replace placeholder with real result
        setLiveSteps(prev => ({
          ...prev,
          [data.code]: (prev[data.code] || []).map(s =>
            s.stepNumber === data.stepNumber ? { ...s, analysis: data.analysis, confidence: data.confidence } : s
          ),
        }))
      } else if (data.type === "control_result") {
        setRunProgress(prev => ({ ...prev, completedControls: [...prev.completedControls, `${data.code}: ${data.severity}`] }))
      } else if (data.type === "complete") {
        setLastRunResult({ totalFindings: data.totalFindings, controls: data.controls || {} })
        setRunning(false)
        setLiveSteps({})
        evtSource.close()
        if (selectedAsset) { loadControls(selectedAsset.id); loadGroupResults(selectedAsset.id) }
      } else if (data.type === "error") {
        console.error("Run error:", data.message)
        setRunning(false)
        evtSource.close()
      }
    }

    evtSource.onerror = () => {
      setRunning(false)
      evtSource.close()
    }
  }

  // If an asset is selected, show the control execution view
  if (selectedAsset) {
    // Compute progress
    const passed = controls.filter(c => c.status === "passed").length
    const warnings = controls.filter(c => c.status === "warning").length
    const errors = controls.filter(c => c.status === "error").length
    const done = passed + warnings + errors
    const total = controls.length || 1
    const pct = Math.round((done / total) * 100)

    // Map controls by code for quick lookup
    const controlByCode: Record<string, Control> = {}
    controls.forEach(c => { controlByCode[c.code] = c })

    // Deduplicate docs: latest per doc_type
    const seenTypes = new Set<string>()
    const uniqueDocs = assetDocs.filter(d => {
      if (seenTypes.has(d.docType)) return false
      seenTypes.add(d.docType)
      return true
    })

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* ═══ HEADER ═══ */}
        <header className="h-14 border-b border-border bg-card shrink-0">
          <div className="flex h-full items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSelectedAsset(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{selectedAsset.name} <span className="text-muted-foreground font-normal text-base">— {selectedAsset.location}</span></h1>
                <p className="text-sm text-muted-foreground">{campaign.fundCode} · {campaign.quarter} {campaign.year}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Progress */}
              <div className="flex items-center gap-2">
                <div className="w-28 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: errors > 0 ? '#ef4444' : warnings > 0 ? '#f59e0b' : '#10b981' }} />
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {done}/{controls.length}
                  {passed > 0 && <span className="text-emerald-600 ml-1 font-medium">{passed}●</span>}
                  {warnings > 0 && <span className="text-amber-600 ml-1 font-medium">{warnings}▲</span>}
                  {errors > 0 && <span className="text-red-600 ml-1 font-medium">{errors}✕</span>}
                </span>
              </div>
              <div className="h-8 w-px bg-border" />
              <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />Import
              </Button>
              <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.xlsx,.xls" onChange={async (e) => {
                const files = Array.from(e.target.files || [])
                for (const file of files) {
                  const fd = new FormData(); fd.append("file", file); fd.append("doc_type", "auto"); fd.append("campaign_id", campaignId)
                  await fetch(`http://localhost:8000/api/assets/${selectedAsset.id}/upload`, { method: "POST", body: fd })
                }
                loadDocs(selectedAsset.id)
                e.target.value = ""
              }} />
              <Button className="gap-2" onClick={handleRunControls} disabled={running}>
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? (runProgress.currentControl || "...").substring(0, 30) : "Run all"}
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => onNavigate("agent-observatory", { assetId: selectedAsset.id })}>
                <Eye className="h-4 w-4" />Observability
              </Button>
            </div>
          </div>
        </header>

        {/* Running banner */}
        {running && (
          <div className="border-b bg-accent/5 px-6 py-2.5 flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <span className="font-medium text-accent">{runProgress.currentControl || "Starting..."}</span>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* ═══ SIDEBAR — Groups > Controls ═══ */}
          <aside className="w-72 border-r border-border bg-sidebar overflow-y-auto shrink-0">
            <div className="p-2">
              {controlGroups.map((group: any) => {
                const groupControls = (group.controls || []).map((gc: any) => controlByCode[gc.code]).filter(Boolean)
                const groupPassed = groupControls.filter((c: Control) => c.status === "passed").length
                const groupErrors = groupControls.filter((c: Control) => c.status === "error").length
                const groupWarnings = groupControls.filter((c: Control) => c.status === "warning").length
                const grpResult = groupResults[group.id]

                return (
                  <div key={group.id} className="mb-3">
                    {/* Group header — clickable to see group conclusion */}
                    <div
                      className={cn("flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer", grpResult ? "hover:bg-sidebar-accent/30" : "hover:bg-sidebar-accent/20")}
                      onClick={() => {
                        setSelectedControl(null)
                        if (grpResult?.conclusion) {
                          setGroupConclusion({ groupName: group.name, conclusion: grpResult.conclusion })
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("w-1 h-5 rounded-full shrink-0", grpResult?.status === "PASS" ? "bg-emerald-500" : grpResult?.status === "FAIL" ? "bg-red-500" : grpResult?.status === "WARNING" ? "bg-amber-500" : "bg-accent")} />
                        <span className="text-sm font-bold text-sidebar-foreground truncate">{group.name}</span>
                        <span className="text-[9px] text-muted-foreground">{groupControls.length}</span>
                        {grpResult && (
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", grpResult.status === "PASS" ? "bg-emerald-100 text-emerald-700" : grpResult.status === "FAIL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{grpResult.status}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {groupPassed > 0 && <span className="text-[9px] text-emerald-600">{groupPassed}●</span>}
                        {groupWarnings > 0 && <span className="text-[9px] text-amber-600">{groupWarnings}▲</span>}
                        {groupErrors > 0 && <span className="text-[9px] text-red-600">{groupErrors}✕</span>}
                        {!running && (
                          <button
                            className="ml-1 p-1 rounded hover:bg-sidebar-accent"
                            title={`Run ${group.name}`}
                            onClick={() => {
                              if (!selectedAsset) return
                              startSSE(`http://localhost:8000/api/assets/${selectedAsset.id}/rerun-stream?campaign_id=${campaignId}&group_id=${group.id}`)
                            }}
                          >
                            <Play className="h-3 w-3 text-accent" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Group conclusion mini-banner (from DB or live SSE) */}
                    {(() => {
                      const conc = grpResult?.conclusion || (groupConclusion?.groupName === group.name ? groupConclusion.conclusion : "")
                      const status = grpResult?.status || ""
                      if (!conc) return null
                      const statusColor = status === "PASS" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : status === "FAIL" ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                      return (
                        <button
                          onClick={() => { setSelectedControl(null); setGroupConclusion({ groupName: group.name, conclusion: conc }) }}
                          className={`mx-2 mt-1 mb-1 px-2.5 py-1.5 rounded-md border text-[10px] text-left w-[calc(100%-16px)] hover:opacity-80 transition-colors ${statusColor}`}
                        >
                          {status && <span className="font-bold mr-1">{status}</span>}
                          <span className="font-semibold">Assessment</span> — {conc.replace(/\*\*/g, "").substring(0, 80)}...
                        </button>
                      )
                    })()}

                    {/* Controls in group */}
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-border pl-3">
                      {(group.controls || []).map((gc: any) => {
                        const ctrl = controlByCode[gc.code]
                        const isSelected = selectedControl?.code === gc.code
                        return (
                          <div
                            key={gc.code}
                            onClick={() => { if (ctrl) setSelectedControl(ctrl) }}
                            className={cn(
                              "group/ctrl w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors cursor-pointer",
                              isSelected ? "bg-accent/10 border border-accent/30" : "hover:bg-sidebar-accent/40"
                            )}
                          >
                            {ctrl?.status === "passed" && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                            {ctrl?.status === "error" && <XCircle className="h-3 w-3 text-red-500 shrink-0" />}
                            {ctrl?.status === "warning" && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                            {(!ctrl || ctrl.status === "not_done") && <div className="h-3 w-3 rounded-full border border-border shrink-0" />}
                            <span className={cn("text-xs font-mono shrink-0", isSelected ? "text-accent font-bold" : "text-muted-foreground")}>{gc.code}</span>
                            <span className="text-xs truncate">{gc.name}</span>
                            {!running && ctrl && (
                              <button
                                className={cn("ml-auto p-1 rounded hover:bg-accent/20", isSelected ? "opacity-100" : "opacity-0 group-hover/ctrl:opacity-100")}
                                title={`Run ${gc.code}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (selectedAsset) startSSE(`http://localhost:8000/api/assets/${selectedAsset.id}/rerun-stream?campaign_id=${campaignId}&control_code=${gc.code}`)
                                }}
                              >
                                <Play className="h-2.5 w-2.5 text-accent" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {controlGroups.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No control groups configured</p>
              )}
            </div>
          </aside>

          {/* ═══ MAIN — Files bar + Control Detail ═══ */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Files bar */}
            <div className="border-b border-border bg-muted/20 px-6 py-3 shrink-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-foreground">Source documents</span>
                <span className="text-xs text-muted-foreground">({uniqueDocs.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueDocs.map((d: any, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border border-border text-xs text-foreground shadow-sm">
                    {d.docType?.includes("pdf") ? <FileText className="h-3.5 w-3.5 text-rose-500" /> : <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />}
                    {d.filename}
                  </span>
                ))}
                {uniqueDocs.length === 0 && (
                  <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    Import files
                  </button>
                )}
              </div>
            </div>

            {/* Control detail */}
            <main className="flex-1 overflow-auto p-6">
              {/* Group conclusion banner — only when viewing a control (not the group view itself) */}
              {groupConclusion && selectedControl && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => setSelectedControl(null)}>
                  <Bot className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-semibold text-amber-800">Assessment {groupConclusion.groupName}</span>
                  <span className="text-xs text-amber-700 truncate">{groupConclusion.conclusion.replace(/\*\*/g, "").substring(0, 100)}...</span>
                  <ChevronRight className="h-3 w-3 text-amber-600 shrink-0 ml-auto" />
                </div>
              )}

              {selectedControl ? (
                <ControlDetail control={selectedControl} liveSteps={running ? liveSteps[selectedControl.code] : undefined} assetId={selectedAsset.id} />
              ) : groupConclusion ? (
                <GroupConclusionView
                  groupConclusion={groupConclusion}
                  controlGroups={controlGroups}
                  groupResults={groupResults}
                  controlByCode={controlByCode}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Select a control
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    )
  }

  // Show the campaign overview with assets list
  const progressPct = Math.round(
    ((campaign.controlsPassed + campaign.controlsError + campaign.controlsWarning) /
      campaign.controlsTotal) *
      100
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate("dashboard")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground">{campaign.fundCode}</h1>
                <Badge className={cn("font-normal", getCampaignStatusColor(campaign.status))}>
                  {getCampaignStatusLabel(campaign.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {campaign.fundName} - {campaign.quarter} {campaign.year}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-2 text-base py-2 px-4">
            <Calendar className="h-4 w-4" />
            {campaign.quarter} {campaign.year}
          </Badge>
        </div>
      </header>

      <main className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">AUM</p>
              <p className="text-2xl font-semibold">{formatAUM(campaign.totalAUM)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Assets</p>
              <p className="text-2xl font-semibold">{campaign.assetsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Controls passed</p>
              <p className="text-2xl font-semibold text-emerald-600">{campaign.controlsPassed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Alerts</p>
              <p className="text-2xl font-semibold text-amber-600">{campaign.controlsWarning}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Gaps</p>
              <p className="text-2xl font-semibold text-red-600">{campaign.controlsError}</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall progress</span>
              <span className="text-sm text-muted-foreground">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </CardContent>
        </Card>

        {/* Assets List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Fund assets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Expert Value
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Controls
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {campaignAssets.map((asset) => (
                  <AssetRow
                    key={asset.id}
                    asset={asset}
                    onClick={() => setSelectedAsset(asset)}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function AssetRow({ asset, onClick }: { asset: CampaignAsset; onClick: () => void }) {
  const progressPct = Math.round(
    ((asset.controlsPassed + asset.controlsError + asset.controlsWarning) / asset.controlsTotal) *
      100
  )

  return (
    <tr className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={onClick}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">{asset.name}</p>
            <p className="text-xs text-muted-foreground">{asset.location}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm">{formatCurrency(asset.expertValue)}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <AssetStatusBadge status={asset.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {asset.controlsPassed}
          </span>
          {asset.controlsWarning > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {asset.controlsWarning}
            </span>
          )}
          {asset.controlsError > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-3.5 w-3.5" />
              {asset.controlsError}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-8">{progressPct}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </td>
    </tr>
  )
}

function AssetStatusBadge({ status }: { status: CampaignAsset["status"] }) {
  switch (status) {
    case "passed":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          OK
        </Badge>
      )
    case "error":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
          <XCircle className="h-3 w-3" />
          Gap
        </Badge>
      )
    case "warning":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Alert
        </Badge>
      )
    case "pending":
      return (
        <Badge className="bg-accent/10 text-accent border-accent/20 gap-1">
          <Clock className="h-3 w-3" />
          In progress
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="gap-1">
          Not done
        </Badge>
      )
  }
}
