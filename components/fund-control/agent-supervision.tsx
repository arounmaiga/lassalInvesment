"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Bot, Wrench, MessageSquare, Pencil, Save, X, Zap, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AppView } from "@/app/page"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface AgentSupervisionProps {
  onNavigate: (view: AppView) => void
}

interface AgentDef {
  id: number
  name: string
  role: string
  tools: string[]
  systemPrompt: string
  color: string
  isActive: number
}

export function AgentSupervision({ onNavigate }: AgentSupervisionProps) {
  const [agents, setAgents] = useState<AgentDef[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentDef | null>(null)
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchAgents = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/agent-defs`)
      if (res.ok) {
        const data: AgentDef[] = await res.json()
        setAgents(data)
        if (data.length > 0 && !selectedAgent) {
          setSelectedAgent(data[0])
        } else if (selectedAgent) {
          // Refresh the selected agent data
          const updated = data.find(a => a.id === selectedAgent.id)
          if (updated) setSelectedAgent(updated)
        }
      }
    } catch (e) {
      console.error("Failed to fetch agents:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  const handleEdit = () => {
    if (!selectedAgent) return
    setEditedPrompt(selectedAgent.systemPrompt)
    setEditingPrompt(true)
  }

  const handleSave = async () => {
    if (!selectedAgent) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/agent-defs/${selectedAgent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: editedPrompt }),
      })
      if (res.ok) {
        const updated: AgentDef = await res.json()
        setSelectedAgent(updated)
        setAgents(prev => prev.map(a => a.id === updated.id ? updated : a))
        setEditingPrompt(false)
      }
    } catch (e) {
      console.error("Failed to save agent:", e)
    } finally {
      setSaving(false)
    }
  }

  const colorMap: Record<string, { bg: string; text: string }> = {
    "bg-purple-100 text-purple-700": { bg: "bg-purple-100", text: "text-purple-700" },
    "bg-blue-100 text-blue-700": { bg: "bg-blue-100", text: "text-blue-700" },
    "bg-emerald-100 text-emerald-700": { bg: "bg-emerald-100", text: "text-emerald-700" },
    "bg-amber-100 text-amber-700": { bg: "bg-amber-100", text: "text-amber-700" },
  }

  const getColors = (color: string) => {
    return colorMap[color] || { bg: "bg-blue-100", text: "text-blue-700" }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card">
        <div className="flex h-full items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onNavigate("landing")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">AI Agent Supervision</h1>
              <p className="text-sm text-muted-foreground">
                View and edit the missions, instructions, and tools for each agent
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={fetchAgents}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Badge variant="outline" className="gap-2 py-2 px-4">
              <Zap className="h-4 w-4" />
              {agents.filter(a => a.isActive).length} active agents
            </Badge>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex h-[calc(100vh-64px)]">
          {/* Left - Agent list */}
          <aside className="w-80 border-r border-border bg-sidebar overflow-y-auto">
            <div className="p-4 border-b border-sidebar-border">
              <h2 className="text-sm font-semibold text-sidebar-foreground">Pipeline agents</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Click on an agent to view its configuration
              </p>
            </div>
            <div className="p-2">
              {agents.map((agent) => {
                const colors = getColors(agent.color)
                return (
                  <button
                    key={agent.id}
                    onClick={() => { setSelectedAgent(agent); setEditingPrompt(false) }}
                    className={cn(
                      "w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors mb-1",
                      selectedAgent?.id === agent.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                    )}
                  >
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5", colors.bg)}>
                      <Bot className={cn("h-4 w-4", colors.text)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        {!agent.isActive && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{(agent.role || "").substring(0, 80)}...</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          {agent.tools.length} tools
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Right - Agent detail */}
          <main className="flex-1 overflow-auto p-6">
            {selectedAgent ? (
              <div className="max-w-3xl space-y-6">
                {/* Agent header */}
                <Card className="border-border">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", getColors(selectedAgent.color).bg)}>
                          <Bot className={cn("h-6 w-6", getColors(selectedAgent.color).text)} />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{selectedAgent.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{selectedAgent.role}</p>
                        </div>
                      </div>
                      <Badge variant={selectedAgent.isActive ? "default" : "outline"}>
                        {selectedAgent.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Tools */}
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-primary" />
                      Available tools ({selectedAgent.tools.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgent.tools.map((tool) => (
                        <div
                          key={tool}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm font-mono"
                        >
                          <Zap className="h-3.5 w-3.5 text-accent" />
                          {tool}
                        </div>
                      ))}
                      {selectedAgent.tools.length === 0 && (
                        <p className="text-sm text-muted-foreground">No tools assigned (orchestration agent)</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Prompt / Instructions */}
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        Agent instructions (System Prompt)
                      </CardTitle>
                      {!editingPrompt ? (
                        <Button variant="outline" size="sm" className="gap-2" onClick={handleEdit}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingPrompt(false)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editingPrompt ? (
                      <Textarea
                        value={editedPrompt}
                        onChange={(e) => setEditedPrompt(e.target.value)}
                        className="min-h-[400px] font-mono text-sm resize-none"
                      />
                    ) : (
                      <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {selectedAgent.systemPrompt}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select an agent to view its configuration
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
