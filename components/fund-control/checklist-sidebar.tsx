"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  Bot, Hand, CheckCircle2, XCircle, AlertTriangle, Circle, Clock,
  Upload, FileText, FileSpreadsheet, RefreshCw, ChevronDown, ChevronRight,
  ExternalLink, X,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import type { Control } from "@/lib/fund-control-data"
type ControlStatus = Control["status"]

interface ChecklistSidebarProps {
  controls: Control[]
  selectedControl: Control
  onSelectControl: (control: Control) => void
  assetId?: string
  campaignId?: string
  onFilesUploaded?: () => void
}

const DOC_TYPES = [
  { key: "expert", label: "Rapport Expert", icon: "pdf", accept: ".pdf" },
  { key: "yardi_bs", label: "Yardi Bilan", icon: "excel", accept: ".xlsx,.xls" },
  { key: "yardi_pl", label: "Yardi P&L", icon: "excel", accept: ".xlsx,.xls" },
  { key: "capex", label: "Suivi CAPEX AM", icon: "excel", accept: ".xlsx,.xls" },
  { key: "tenant", label: "Situation Locative", icon: "excel", accept: ".xlsx,.xls" },
]

function getStatusIcon(status: ControlStatus) {
  switch (status) {
    case "passed": return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case "error": return <XCircle className="h-4 w-4 text-red-600" />
    case "warning": return <AlertTriangle className="h-4 w-4 text-amber-600" />
    case "pending": return <Clock className="h-4 w-4 text-accent animate-pulse" />
    default: return <Circle className="h-4 w-4 text-muted-foreground/50" />
  }
}

function getStatusLabel(status: ControlStatus) {
  switch (status) {
    case "passed": return "Passe"
    case "error": return "Ecart detecte"
    case "warning": return "Attention"
    case "pending": return "En cours"
    default: return "Non effectue"
  }
}

export function ChecklistSidebar({
  controls,
  selectedControl,
  onSelectControl,
  assetId,
  campaignId = "camp1",
  onFilesUploaded,
}: ChecklistSidebarProps) {
  interface UploadedFile {
    name: string
    storedName: string
    summary?: string
    keyFigures?: Record<string, any>
    valuationDate?: string
    uploadedAt?: string
    uploading?: boolean
  }

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [docsExpanded, setDocsExpanded] = useState(true)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing documents from API on mount
  useEffect(() => {
    if (!assetId) return
    fetch(`http://localhost:8000/api/assets/${assetId}/documents?campaign_id=${campaignId}`)
      .then((r) => r.json())
      .then((docs: Array<{ filename: string; summary?: string; keyFigures?: Record<string, any>; uploadedAt?: string }>) => {
        // Deduplicate by filename, keep latest
        const seen = new Set<string>()
        const loaded: UploadedFile[] = []
        for (const d of docs) {
          if (!seen.has(d.filename)) {
            seen.add(d.filename)
            loaded.push({
              name: d.filename,
              storedName: d.filename,
              summary: d.summary,
              keyFigures: d.keyFigures,
              valuationDate: d.keyFigures?.valuation_date,
              uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toLocaleString("fr-FR") : undefined,
            })
          }
        }
        setFiles(loaded)
      })
      .catch(() => {})
  }, [assetId, campaignId])

  const completedCount = controls.filter(
    (c) => c.status !== "not_done" && c.status !== "pending"
  ).length
  const progressPercent = controls.length > 0 ? (completedCount / controls.length) * 100 : 0

  // Build control groups from controls array
  const groupOrder = [
    "Revue de la Valorisation",
    "Revue des revenus",
    "Revue des dettes",
    "Revue de la tresorerie",
    "Controle des distributions",
    "Conformite & compliance",
  ]
  const controlGroups = groupOrder
    .map((name) => ({
      name,
      type: controls.find((c) => c.group === name)?.type || ("manual" as "ai" | "manual"),
      controls: controls.filter((c) => c.group === name),
    }))
    .filter((g) => g.controls.length > 0)

  const handleUploadFiles = async (fileList: File[]) => {
    if (!assetId) return
    for (const file of fileList) {
      // Add placeholder immediately
      const placeholder: UploadedFile = { name: file.name, storedName: "", uploading: true }
      setFiles((prev) => [...prev.filter((f) => f.name !== file.name), placeholder])

      // LLM classifies the document type automatically
      const docType = "auto"

      const formData = new FormData()
      formData.append("file", file)
      formData.append("doc_type", docType)
      formData.append("campaign_id", campaignId)

      try {
        const res = await fetch(`http://localhost:8000/api/assets/${assetId}/upload`, {
          method: "POST",
          body: formData,
        })
        const data = await res.json()
        setFiles((prev) => prev.map((f) =>
          f.name === file.name
            ? {
                name: file.name,
                storedName: data.filename || file.name,
                summary: data.summary,
                keyFigures: data.keyFigures,
                valuationDate: data.valuationDate,
                uploadedAt: new Date().toLocaleString("fr-FR"),
                uploading: false,
              }
            : f
        ))
        onFilesUploaded?.()
      } catch (e) {
        setFiles((prev) => prev.filter((f) => f.name !== file.name))
        console.error("Upload failed:", e)
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleUploadFiles(Array.from(e.dataTransfer.files))
  }

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  return (
    <aside className="w-[420px] border-r border-border bg-sidebar overflow-y-auto shrink-0">
      {/* Hidden file input for multi-upload */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.xlsx,.xls"
        multiple
        onChange={(e) => {
          const selected = Array.from(e.target.files || [])
          if (selected.length > 0) handleUploadFiles(selected)
          e.target.value = ""
        }}
      />

      {/* Header */}
      <div className="sticky top-0 bg-sidebar/95 backdrop-blur-sm p-4 border-b border-sidebar-border z-10">
        <h2 className="text-sm font-semibold text-sidebar-foreground mb-1">
          Control checklist
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {completedCount}/{controls.length} controls completed
        </p>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Documents section */}
      <div className="border-b border-sidebar-border">
        <button
          onClick={() => setDocsExpanded(!docsExpanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-sidebar-accent/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Documents sources
            </span>
            <span className="text-[10px] text-muted-foreground">
              ({files.length})
            </span>
          </div>
          {docsExpanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          }
        </button>

        {docsExpanded && (
          <div
            className="px-3 pb-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-sidebar-border rounded-lg p-3 mb-2 text-center hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer"
            >
              <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs font-medium text-sidebar-foreground">Importer des fichiers</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Cliquez ou glissez vos fichiers (PDF, Excel)
              </p>
            </button>

            {/* File list */}
            <div className="space-y-1.5">
              {files.map((file) => {
                const isPdf = file.name.toLowerCase().endsWith(".pdf")
                const isExpanded = expandedDoc === file.name

                return (
                  <div
                    key={file.name}
                    className="rounded-lg text-xs overflow-hidden bg-emerald-50 border border-emerald-200"
                  >
                    {/* File header */}
                    <div className="flex items-center gap-2 px-2.5 py-2">
                      {isPdf
                        ? <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        : <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      }
                      <button
                        onClick={() => setExpandedDoc(isExpanded ? null : file.name)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="font-semibold text-emerald-800 truncate">{file.name}</p>
                        {file.uploadedAt && (
                          <p className="text-[10px] text-emerald-600">{file.uploadedAt}</p>
                        )}
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {file.uploading ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent" />
                        ) : (
                          <>
                            <button onClick={() => window.open(`http://localhost:8000/api/documents/${assetId}/file/${file.storedName}`, "_blank")}
                              className="p-1 rounded hover:bg-emerald-100" title="Ouvrir">
                              <ExternalLink className="h-3 w-3 text-emerald-600" />
                            </button>
                            <button onClick={() => removeFile(file.name)}
                              className="p-1 rounded hover:bg-red-100" title="Supprimer">
                              <X className="h-3 w-3 text-red-400" />
                            </button>
                            <ChevronDown className={cn("h-3 w-3 text-emerald-400 transition-transform", isExpanded && "rotate-180")} />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded — AI summary */}
                    {isExpanded && !file.uploading && (
                      <div className="px-3 pb-2.5 border-t border-emerald-200/60">
                        {file.valuationDate && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Clock className="h-3 w-3 text-emerald-700" />
                            <span className="text-[10px] font-semibold text-emerald-800">
                              Date de valeur : {file.valuationDate}
                            </span>
                          </div>
                        )}
                        <div className="mt-2 bg-white/70 rounded-md p-2.5 border border-emerald-100">
                          <div className="flex items-center gap-1 mb-1.5">
                            <Bot className="h-3 w-3 text-emerald-700" />
                            <span className="text-[10px] font-semibold text-emerald-800">Analyse IA</span>
                          </div>
                          {file.summary ? (
                            <div className="space-y-1">
                              {file.summary.split("\n").filter(Boolean).map((line: string, i: number) => {
                                const isAnomaly = line.toLowerCase().includes("anomalie")
                                const isClean = isAnomaly && line.toLowerCase().includes("aucune")
                                return (
                                  <p key={i} className={cn(
                                    "text-[11px] leading-relaxed",
                                    isAnomaly && !isClean ? "text-red-600 font-medium" :
                                    isAnomaly && isClean ? "text-emerald-700 font-medium" :
                                    "text-emerald-900/80"
                                  )}>
                                    {line}
                                  </p>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-[10px] text-emerald-600 italic">
                              Analyse non disponible
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Control Groups */}
      <div className="p-2">
        {controlGroups.map((group) => (
          <div key={group.name} className="mb-4">
            <div className="flex items-center gap-2 px-2 py-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {group.name}
              </span>
              {group.type === "ai" ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                  <Bot className="h-3 w-3" />
                  IA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                  <Hand className="h-3 w-3" />
                  Manuel
                </span>
              )}
            </div>
            <div className="space-y-0.5">
              {group.controls.map((control) => (
                <button
                  key={control.id}
                  onClick={() => onSelectControl(control)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                    selectedControl.id === control.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                  )}
                >
                  {getStatusIcon(control.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{control.code}</span>
                      <span className="text-sm font-medium truncate">{control.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{getStatusLabel(control.status)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
