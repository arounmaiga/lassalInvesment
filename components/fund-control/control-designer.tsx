"use client"

import { useState, useEffect, useRef } from "react"
import {
  ArrowLeft, Plus, Save, Zap, Bot, CheckCircle2, AlertTriangle,
  ChevronLeft, ChevronRight, Play, FileText, Loader2, Pencil, Trash2,
  Upload, PanelLeftClose, PanelLeftOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { AppView } from "@/app/page"

interface ControlDesignerProps {
  onNavigate: (view: AppView) => void
}

interface ControlGroup {
  id: number; name: string; description: string; controlsCount: number
  controls: Array<{ id: number; code: string; name: string; difficulty: string }>
}

interface ControlDef {
  id: number; code: string; name: string; objective: string
  operatingProcedure: string; difficulty: string; plans?: ExecutionPlan[]
}

interface ExecutionPlan {
  id: number; version: number; status: string
  steps: Array<{ step_number: number; agent: string; action: string; tools: string[]; input_files: string[]; output: string; has_matching_agent: boolean }>
  warnings: string[]; generatedAt: string
  lastSimulation?: any
}

const AGENT_COLORS: Record<string, string> = {
  "Extraction": "bg-purple-100 text-purple-700 border-purple-300",
  "Data Extraction": "bg-purple-100 text-purple-700 border-purple-300",
  "Analyst": "bg-blue-100 text-blue-700 border-blue-300",
  "Reconciliation": "bg-amber-100 text-amber-700 border-amber-300",
  "Anomaly Detection": "bg-red-100 text-red-700 border-red-300",
  "Audit Trail": "bg-emerald-100 text-emerald-700 border-emerald-300",
  "Supervisor": "bg-amber-100 text-amber-700 border-amber-300",
  "Reporting": "bg-cyan-100 text-cyan-700 border-cyan-300",
}

export function ControlDesigner({ onNavigate }: ControlDesignerProps) {
  const [groups, setGroups] = useState<ControlGroup[]>([])
  const [selectedControl, setSelectedControl] = useState<ControlDef | null>(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<any>(null)
  const [simFiles, setSimFiles] = useState<Array<{name: string; type: string; summary?: string}>>([])

  // Column visibility
  const [colDef, setColDef] = useState(true)
  const [colPlan, setColPlan] = useState(true)

  // Creation mode
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [creatingInGroup, setCreatingInGroup] = useState<number | null>(null)

  // Form
  const [formCode, setFormCode] = useState("")
  const [formName, setFormName] = useState("")
  const [formObjective, setFormObjective] = useState("")
  const [formProcedure, setFormProcedure] = useState("")
  const [formDifficulty, setFormDifficulty] = useState("Moyen")
  const [formGroupName, setFormGroupName] = useState("")
  const [formGroupDesc, setFormGroupDesc] = useState("")
  const [editMode, setEditMode] = useState(false)

  const simFileRef = useRef<HTMLInputElement>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())
  const [fileDetail, setFileDetail] = useState<{name: string; type: string; summary?: string} | null>(null)

  const refreshGroups = () => fetch("http://localhost:8000/api/control-groups").then(r => r.json()).then(setGroups)

  useEffect(() => { refreshGroups() }, [])

  const loadControl = (id: number) => {
    setCreatingGroup(false); setCreatingInGroup(null); setEditMode(false); setSimulationResult(null)
    fetch(`http://localhost:8000/api/control-definitions/${id}`)
      .then(r => r.json())
      .then((d: ControlDef) => {
        setSelectedControl(d)
        setFormObjective(d.objective); setFormProcedure(d.operatingProcedure || ""); setFormDifficulty(d.difficulty)
        // Load persisted simulation from the latest plan
        const latestPlan = d.plans?.[0]
        if (latestPlan?.lastSimulation) {
          setSimulationResult(latestPlan.lastSimulation)
        } else {
          setSimulationResult(null)
        }
      })
  }

  const handleSave = async () => {
    if (!selectedControl) return; setSaving(true)
    await fetch(`http://localhost:8000/api/control-definitions/${selectedControl.id}`, {
      method: "PUT", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ objective: formObjective, operatingProcedure: formProcedure, difficulty: formDifficulty }),
    })
    setSaving(false); setEditMode(false); loadControl(selectedControl.id)
  }

  const handleCreateControl = async () => {
    if (!creatingInGroup || !formCode || !formName) return; setSaving(true)
    const resp = await fetch(`http://localhost:8000/api/control-groups/${creatingInGroup}/controls`, {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ code: formCode, name: formName, objective: formObjective || "A definir", operatingProcedure: formProcedure, difficulty: formDifficulty }),
    })
    const created = await resp.json(); refreshGroups(); setCreatingInGroup(null); setSaving(false); loadControl(created.id)
  }

  const handleCreateGroup = async () => {
    if (!formGroupName) return; setSaving(true)
    await fetch("http://localhost:8000/api/control-groups", {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ name: formGroupName, description: formGroupDesc, controlType: "ai" }),
    })
    refreshGroups(); setCreatingGroup(false); setSaving(false)
  }

  const handleGenerate = async () => {
    if (!selectedControl) return; setGenerating(true)
    await fetch(`http://localhost:8000/api/control-definitions/${selectedControl.id}/generate-plan`, { method: "POST" })
    loadControl(selectedControl.id); setGenerating(false)
  }

  const handleSimulate = () => {
    const plan = selectedControl?.plans?.[0]
    if (!plan) return
    setSimulating(true)
    setSimulationResult({ steps: [], totalSteps: 0 })
    setExpandedSteps(new Set())

    // Use SSE to stream results step by step
    const evtSource = new EventSource(`http://localhost:8000/api/execution-plans/${plan.id}/simulate-stream`)

    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === "init") {
        setSimulationResult((prev: any) => ({ ...prev, ...data, steps: [] }))
      } else if (data.type === "step_start") {
        // Add placeholder for this step
        setSimulationResult((prev: any) => ({
          ...prev,
          steps: [...(prev?.steps || []), { ...data, result: "Analysis in progress...", confidence: null }],
        }))
      } else if (data.type === "step_result") {
        // Replace placeholder with real result
        setSimulationResult((prev: any) => ({
          ...prev,
          steps: (prev?.steps || []).map((s: any) =>
            s.stepNumber === data.stepNumber ? data : s
          ),
        }))
      } else if (data.type === "complete") {
        setSimulationResult(data)
        setSimulating(false)
        evtSource.close()
      } else if (data.type === "error") {
        setSimulating(false)
        evtSource.close()
      }
    }

    evtSource.onerror = () => {
      setSimulating(false)
      evtSource.close()
    }
  }

  const activePlan = selectedControl?.plans?.[0]
  const ctrlLabel = selectedControl ? `${selectedControl.code} — ` : ""
  const isEditing = editMode || !!creatingInGroup

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card shrink-0">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigate("landing")}><ArrowLeft className="h-4 w-4" /></Button>
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold">Control Designer</h1>
          </div>
        </div>
      </header>

      {/* 4 columns */}
      <div className="flex flex-1 overflow-hidden">

        {/* COL 1 — Familles & Controles */}
        <aside className="w-72 border-r border-border bg-sidebar overflow-y-auto shrink-0">
          <div className="p-3 border-b border-sidebar-border">
            <Button size="sm" variant="outline" className="w-full gap-1.5 h-8 text-xs" onClick={() => {
              setCreatingGroup(true); setSelectedControl(null); setCreatingInGroup(null)
              setFormGroupName(""); setFormGroupDesc("")
            }}>
              <Plus className="h-3.5 w-3.5" />New family
            </Button>
          </div>
          <div className="p-2">
            {groups.map((group) => {
              // Auto-numbering: find highest Cxx number across all groups
              const allControls = groups.flatMap(g => g.controls)
              const maxNum = allControls.reduce((max, c) => {
                const m = c.code.match(/^C(\d+)$/)
                return m ? Math.max(max, parseInt(m[1])) : max
              }, 0)
              const nextId = maxNum + 1

              return (
              <div key={group.id} className="mb-4">
                {/* Group header */}
                <div className="flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-sidebar-accent/20 group/h">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1 h-5 rounded-full bg-accent shrink-0" />
                    <span className="text-sm font-bold text-sidebar-foreground truncate">{group.name}</span>
                    <Badge variant="outline" className="text-[9px] shrink-0">{group.controlsCount}</Badge>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover/h:opacity-100 shrink-0">
                    <button className="p-1 rounded hover:bg-sidebar-accent" title="Add a control" onClick={() => {
                      setCreatingInGroup(group.id); setSelectedControl(null); setCreatingGroup(false)
                      setFormCode(`C${nextId}`); setFormName(""); setFormObjective(""); setFormProcedure(""); setFormDifficulty("Moyen"); setEditMode(true)
                    }}><Plus className="h-3.5 w-3.5" /></button>
                    <button className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600" onClick={() => {
                      if (confirm(`Delete "${group.name}" and all its controls?`)) fetch(`http://localhost:8000/api/control-groups/${group.id}`, { method: "DELETE" }).then(refreshGroups)
                    }}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {/* Controls list */}
                <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-border pl-3">
                {group.controls.map((c) => (
                  <div key={c.id} className={cn(
                    "flex items-center rounded-md px-2.5 py-2 group/c transition-colors",
                    selectedControl?.id === c.id
                      ? "bg-accent/10 border border-accent/30"
                      : "hover:bg-sidebar-accent/40"
                  )}>
                    <button onClick={() => loadControl(c.id)} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-mono font-bold shrink-0", selectedControl?.id === c.id ? "text-accent" : "text-muted-foreground")}>{c.code}</span>
                        <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                      </div>
                    </button>
                    <button className="p-1 rounded hover:bg-red-100 opacity-0 group-hover/c:opacity-100 shrink-0" onClick={() => {
                      if (confirm(`Delete ${c.code} "${c.name}"?`)) {
                        if (selectedControl?.id === c.id) setSelectedControl(null)
                        fetch(`http://localhost:8000/api/control-definitions/${c.id}`, { method: "DELETE" }).then(refreshGroups)
                      }
                    }}><Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-600" /></button>
                  </div>
                ))}
                </div>
              </div>
              )
            })}
          </div>
        </aside>

        {/* COL 2 — Définition (repliable) */}
        {colDef ? (
          <div className="flex-1 border-r border-border overflow-y-auto min-w-0">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 sticky top-0 z-10">
              <span className="text-xs font-semibold text-foreground">{ctrlLabel}Definition</span>
              <div className="flex items-center gap-1">
                {selectedControl && !creatingInGroup && !creatingGroup && (
                  <Button size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={handleGenerate} disabled={generating}>
                    {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}{generating ? "..." : "Generate plan"}
                  </Button>
                )}
                <button onClick={() => setColDef(false)} className="p-1 rounded hover:bg-muted" title="Collapse"><PanelLeftClose className="h-3.5 w-3.5 text-muted-foreground" /></button>
              </div>
            </div>
            <div className="p-3">
              {creatingGroup ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">New family</h3>
                  <Input value={formGroupName} onChange={e => setFormGroupName(e.target.value)} placeholder="Family name" className="h-8 text-sm" autoFocus />
                  <Textarea value={formGroupDesc} onChange={e => setFormGroupDesc(e.target.value)} placeholder="Description..." className="min-h-[60px] text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateGroup} disabled={saving || !formGroupName} className="gap-1"><Save className="h-3 w-3" />Create</Button>
                    <Button size="sm" variant="outline" onClick={() => setCreatingGroup(false)}>Cancel</Button>
                  </div>
                </div>
              ) : creatingInGroup ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">New control</h3>
                  <p className="text-[10px] text-muted-foreground">Family: {groups.find(g => g.id === creatingInGroup)?.name}</p>
                  <div className="grid grid-cols-[60px_1fr] gap-2">
                    <div className="h-8 flex items-center justify-center rounded-md bg-muted text-sm font-mono font-bold text-muted-foreground">{formCode}</div>
                    <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Control name" className="h-8 text-sm" autoFocus />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2"><div className="w-1 h-4 rounded bg-accent" /><span className="text-sm font-semibold text-foreground">Objective</span></div>
                    <Textarea value={formObjective} onChange={e => setFormObjective(e.target.value)} placeholder="What this control verifies..." className="min-h-[60px] text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><div className="w-1 h-4 rounded bg-accent" /><span className="text-sm font-semibold text-foreground">Operating procedure</span></div><span className="text-[10px] text-muted-foreground">{formProcedure.split(/\s+/).filter(Boolean).length} mots</span></div>
                    <Textarea value={formProcedure} onChange={e => setFormProcedure(e.target.value)} placeholder="Describe the detailed control steps. This text will be read by the AI to generate the execution plan..." className="min-h-[200px] text-sm" />
                  </div>
                  <Select value={formDifficulty} onValueChange={setFormDifficulty}>
                    <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Facile">Easy</SelectItem><SelectItem value="Moyen">Medium</SelectItem><SelectItem value="Difficile">Hard</SelectItem></SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateControl} disabled={saving || !formCode || !formName} className="gap-1"><Save className="h-3 w-3" />Create</Button>
                    <Button size="sm" variant="outline" onClick={() => setCreatingInGroup(null)}>Cancel</Button>
                  </div>
                </div>
              ) : selectedControl ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div><span className="text-xs font-mono text-muted-foreground">{selectedControl.code}</span> <span className="text-sm font-bold">{selectedControl.name}</span></div>
                    {!editMode ? <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditMode(true)}><Pencil className="h-3 w-3" />Edit</Button>
                    : <div className="flex gap-1"><Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Save</Button><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditMode(false)}>Cancel</Button></div>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2"><div className="w-1 h-4 rounded bg-accent" /><span className="text-sm font-semibold text-foreground">Objective</span></div>
                    {editMode ? <Textarea value={formObjective} onChange={e => setFormObjective(e.target.value)} className="min-h-[60px] text-sm" />
                    : <p className="text-sm leading-relaxed bg-muted/30 rounded-md p-3">{selectedControl.objective}</p>}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><div className="w-1 h-4 rounded bg-accent" /><span className="text-sm font-semibold text-foreground">Operating procedure</span></div><span className="text-[10px] text-muted-foreground">{(selectedControl.operatingProcedure || "").split(/\s+/).filter(Boolean).length} mots</span></div>
                    {editMode ? <Textarea value={formProcedure} onChange={e => setFormProcedure(e.target.value)} className="min-h-[250px] text-sm" />
                    : <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-md p-3">{selectedControl.operatingProcedure || "Not defined"}</p>}
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Select a control</p>}
            </div>
          </div>
        ) : (
          <button onClick={() => setColDef(true)} className="w-8 border-r border-border bg-muted/30 flex items-center justify-center hover:bg-muted shrink-0" title="Expand Definition">
            <PanelLeftOpen className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}

        {/* COL 3+4 FUSIONNEES — Plan + Simulation alignés (repliable) */}
        {colPlan ? (
          <div className="flex-[2] overflow-y-auto min-w-0">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 sticky top-0 z-10">
              <span className="text-xs font-semibold text-foreground">{ctrlLabel}Plan &amp; Simulation</span>
              <div className="flex items-center gap-1">
                {selectedControl && (
                  <>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={() => simFileRef.current?.click()}>
                      <Upload className="h-3 w-3" />Files
                    </Button>
                    {activePlan && (
                      <Button size="sm" className="h-6 text-[10px] gap-1 px-2 bg-accent hover:bg-accent/90" onClick={handleSimulate} disabled={simulating}>
                        {simulating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}{simulating ? "..." : "Test"}
                      </Button>
                    )}
                  </>
                )}
                <button onClick={() => setColPlan(false)} className="p-1 rounded hover:bg-muted"><PanelLeftClose className="h-3.5 w-3.5 text-muted-foreground" /></button>
              </div>
            </div>

            {/* Hidden file input */}
            <input ref={simFileRef} type="file" className="hidden" multiple accept=".pdf,.xlsx,.xls" onChange={async (e) => {
              const files = Array.from(e.target.files || [])
              for (const file of files) {
                setSimFiles(prev => [...prev, {name: file.name, type: file.name.endsWith(".pdf") ? "pdf" : "excel"}])
                const fd = new FormData(); fd.append("file", file); fd.append("doc_type", "auto"); fd.append("campaign_id", "camp1")
                const resp = await fetch("http://localhost:8000/api/assets/WP003/upload", { method: "POST", body: fd })
                const data = await resp.json()
                setSimFiles(prev => prev.map(f => f.name === file.name ? {...f, summary: data.summary, type: data.doc_type || f.type} : f))
              }
              e.target.value = ""
            }} />

            <div className="p-2">
              {/* Uploaded test files */}
              {simFiles.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3 px-1">
                  {simFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-[10px]">
                      <FileText className="h-3 w-3 text-emerald-600" />
                      <button onClick={() => setFileDetail(f)} className="text-emerald-800 truncate max-w-[120px] hover:underline cursor-pointer" title="View analysis">{f.name}</button>
                      {f.type && f.type !== "pdf" && f.type !== "excel" && <span className="text-[8px] px-1 rounded bg-emerald-200 text-emerald-800">{f.type}</span>}
                      {f.summary ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> : <Loader2 className="h-2.5 w-2.5 animate-spin text-emerald-400" />}
                      <button onClick={() => setSimFiles(prev => prev.filter((_, j) => j !== i))} className="hover:text-red-600"><Trash2 className="h-2.5 w-2.5" /></button>
                    </div>
                  ))}
                </div>
              )}

              {activePlan && selectedControl?.updatedAt && activePlan.generatedAt &&
                new Date(selectedControl.updatedAt) > new Date(activePlan.generatedAt) && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700 mb-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>The operating procedure has been modified since this plan was generated. Consider regenerating the plan.</span>
                </div>
              )}

              {activePlan ? (
                <div className="space-y-2">
                  {/* Steps: plan + simulation result aligned */}
                  {activePlan.steps.map((planStep) => {
                    const simStep = simulationResult?.steps?.find((s: any) => s.stepNumber === planStep.step_number)
                    return (
                      <div key={planStep.step_number} className="rounded-lg border border-border overflow-hidden">
                        {/* Step header */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 border-b border-border">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0">{planStep.step_number}</span>
                          <Badge variant="outline" className={cn("text-[10px] font-semibold py-0.5 px-2 border", AGENT_COLORS[planStep.agent] || "bg-muted text-muted-foreground border-border")}>{planStep.agent}</Badge>
                          {planStep.has_matching_agent ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                          <div className="flex flex-wrap gap-1 ml-auto">{planStep.tools.map(t => <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{t}</span>)}</div>
                          {simStep?.confidence != null && (
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded",
                              simStep.confidence >= 80 ? "bg-emerald-100 text-emerald-700" :
                              simStep.confidence >= 50 ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            )}>{simStep.confidence}%</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 divide-x divide-border">
                          {/* Left: Plan instruction */}
                          <div className="p-2.5">
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Instruction</p>
                            <p className="text-[11px] text-foreground leading-relaxed">{planStep.action}</p>
                          </div>

                          {/* Right: Simulation result */}
                          <div className="p-2.5 bg-card">
                            {simStep ? (() => {
                              const isExpanded = expandedSteps.has(planStep.step_number)
                              const text = simStep.result || ""
                              const isLong = text.length > 200
                              return (
                                <>
                                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Result</p>
                                  <div className={cn("text-[11px] text-foreground leading-relaxed whitespace-pre-wrap", !isExpanded && isLong && "line-clamp-4")}>
                                    {text}
                                  </div>
                                  {isLong && (
                                    <button
                                      onClick={() => setExpandedSteps(prev => {
                                        const next = new Set(prev)
                                        if (next.has(planStep.step_number)) next.delete(planStep.step_number)
                                        else next.add(planStep.step_number)
                                        return next
                                      })}
                                      className="text-[10px] text-accent font-medium mt-1 hover:underline"
                                    >
                                      {isExpanded ? "Collapse" : "View all"}
                                    </button>
                                  )}
                                </>
                              )
                            })() : simulating ? (
                              <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" /><span className="text-[10px]">Waiting...</span>
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground italic py-4 text-center">Click &quot;Test&quot;</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Warnings */}
                  {activePlan.warnings?.length > 0 && (
                    <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5 inline mr-1.5" />
                      <span className="font-semibold">Warnings: </span>
                      {activePlan.warnings.join(". ")}
                    </div>
                  )}
                </div>
              ) : selectedControl ? (
                <p className="text-xs text-muted-foreground text-center py-12">Click &quot;Generate plan&quot; to create the execution plan</p>
              ) : null}
            </div>
          </div>
        ) : (
          <button onClick={() => setColPlan(true)} className="w-8 bg-muted/30 flex items-center justify-center hover:bg-muted shrink-0">
            <PanelLeftOpen className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Modal: File analysis detail */}
      {fileDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => setFileDetail(null)}>
          <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 shrink-0">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{fileDetail.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {fileDetail.type && <Badge className="text-[10px] bg-emerald-100 text-emerald-700">{fileDetail.type}</Badge>}
                    <span className="text-xs text-muted-foreground">AI analysis</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setFileDetail(null)} className="px-3 py-1.5 rounded-lg hover:bg-muted text-sm text-muted-foreground">Close</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-5 w-5 text-accent" />
                <span className="text-sm font-semibold text-foreground">Briefing document</span>
              </div>
              {fileDetail.summary ? (
                <div className="space-y-1">
                  {fileDetail.summary.split("\n").map((line: string, i: number) => {
                    const trimmed = line.trim()
                    const isSection = /^\d+\.\s/.test(trimmed) || /^[A-Z\s&]{5,}$/.test(trimmed)
                    const isAlert = trimmed.toLowerCase().includes("anomalie") || trimmed.toLowerCase().includes("attention") || trimmed.toLowerCase().includes("suspect") || trimmed.toLowerCase().includes("incoherence")
                    const isOk = trimmed.toLowerCase().includes("aucune anomalie")
                    return (
                      <p key={i} className={cn(
                        isSection ? "font-semibold text-foreground mt-4 text-[13px]" : "text-[13px] leading-relaxed",
                        isAlert && !isOk ? "text-amber-700 font-medium bg-amber-50 px-2 py-1 rounded" : "",
                        isOk ? "text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded" : "",
                        !isSection && !isAlert && !isOk ? "text-foreground/80" : "",
                      )}>
                        {trimmed}
                      </p>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Analysis in progress...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
