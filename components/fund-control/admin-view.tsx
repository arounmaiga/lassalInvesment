"use client"

import { useState, useEffect, useRef } from "react"
import {
  ArrowLeft, Building2, Plus, Pencil, Trash2, Save, X,
  MapPin, Ruler, DollarSign, ChevronRight, Upload, CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatAUM } from "@/lib/campaign-data"
import type { AppView } from "@/app/page"

interface AdminViewProps {
  onNavigate: (view: AppView) => void
}

interface Fund {
  id: string
  name: string
  code: string
  aum: number
  assetsCount: number
  currency: string
}

interface Asset {
  id?: number
  assetId: string
  fundId: string
  name: string
  location: string
  assetType: string
  areaSqm: number
}

const ASSET_TYPES = [
  "Office HQE",
  "Office Park",
  "Office Campus",
  "Mixed-Use",
  "Logistics Hub",
  "Retail",
  "Residential",
]

export function AdminView({ onNavigate }: AdminViewProps) {
  const [funds, setFunds] = useState<Fund[]>([])
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

  // Fund form
  const [showFundForm, setShowFundForm] = useState(false)
  const [fundForm, setFundForm] = useState({ name: "", code: "", aum: "", currency: "EUR" })

  // Import
  const importRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState("")
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("http://localhost:8000/api/admin/import", { method: "POST", body: fd })
      const data = await res.json()
      setImportStatus("ok")
      // Reload funds
      fetch("http://localhost:8000/api/funds").then(r => r.json()).then(setFunds)
      setTimeout(() => setImportStatus(""), 3000)
    } catch (err) {
      console.error("Import failed:", err)
    }
    e.target.value = ""
  }

  // Asset form
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [assetForm, setAssetForm] = useState({ assetId: "", name: "", location: "", assetType: "Office HQE", areaSqm: "" })

  // Load funds
  useEffect(() => {
    fetch("http://localhost:8000/api/funds")
      .then((r) => r.json())
      .then((data) => { setFunds(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Load assets when fund selected
  useEffect(() => {
    if (!selectedFund) { setAssets([]); return }
    fetch(`http://localhost:8000/api/admin/funds/${selectedFund.id}/assets`)
      .then((r) => r.json())
      .then(setAssets)
      .catch(() => setAssets([]))
  }, [selectedFund])

  const handleCreateFund = async () => {
    const res = await fetch("http://localhost:8000/api/admin/funds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fundForm.name,
        code: fundForm.code,
        aum: parseFloat(fundForm.aum) || 0,
        currency: fundForm.currency,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setFunds((prev) => [...prev, data])
      setShowFundForm(false)
      setFundForm({ name: "", code: "", aum: "", currency: "EUR" })
    }
  }

  const handleCreateAsset = async () => {
    if (!selectedFund) return
    const res = await fetch(`http://localhost:8000/api/admin/funds/${selectedFund.id}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: assetForm.assetId,
        name: assetForm.name,
        location: assetForm.location,
        assetType: assetForm.assetType,
        areaSqm: parseFloat(assetForm.areaSqm) || 0,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setAssets((prev) => [...prev, data])
      setShowAssetForm(false)
      setAssetForm({ assetId: "", name: "", location: "", assetType: "Office HQE", areaSqm: "" })
      // Update fund assets count
      setFunds((prev) => prev.map((f) => f.id === selectedFund.id ? { ...f, assetsCount: f.assetsCount + 1 } : f))
    }
  }

  const handleDeleteAsset = async (assetId: string) => {
    if (!selectedFund || !confirm("Supprimer cet actif ?")) return
    await fetch(`http://localhost:8000/api/admin/funds/${selectedFund.id}/assets/${assetId}`, { method: "DELETE" })
    setAssets((prev) => prev.filter((a) => a.assetId !== assetId))
    setFunds((prev) => prev.map((f) => f.id === selectedFund.id ? { ...f, assetsCount: Math.max(0, f.assetsCount - 1) } : f))
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Administration</h1>
              <p className="text-sm text-muted-foreground">Fund and asset management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={importRef} type="file" className="hidden" accept=".json" onChange={handleImport} />
            <Button variant="outline" className="gap-2" onClick={() => importRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {importStatus === "ok" ? "Imported!" : "Import JSON"}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left — Funds list */}
        <aside className="w-80 border-r border-border bg-sidebar overflow-y-auto">
          <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-sidebar-foreground">Funds</h2>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowFundForm(true)}>
              <Plus className="h-3 w-3" />
              New
            </Button>
          </div>

          {/* New fund form */}
          {showFundForm && (
            <div className="p-3 border-b border-sidebar-border bg-sidebar-accent/30">
              <div className="space-y-2">
                <Input placeholder="Nom du fonds" value={fundForm.name} onChange={(e) => setFundForm({ ...fundForm, name: e.target.value })} className="h-8 text-xs" />
                <div className="flex gap-2">
                  <Input placeholder="Code" value={fundForm.code} onChange={(e) => setFundForm({ ...fundForm, code: e.target.value })} className="h-8 text-xs w-24" />
                  <Input placeholder="AUM (EUR)" type="number" value={fundForm.aum} onChange={(e) => setFundForm({ ...fundForm, aum: e.target.value })} className="h-8 text-xs" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs gap-1 flex-1" onClick={handleCreateFund} disabled={!fundForm.name || !fundForm.code}>
                    <Save className="h-3 w-3" />Creer
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowFundForm(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Funds */}
          <div className="p-2">
            {loading ? (
              <p className="text-xs text-muted-foreground p-4">Chargement...</p>
            ) : funds.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4">Aucun fonds. Creez-en un.</p>
            ) : (
              funds.map((fund) => (
                <button
                  key={fund.id}
                  onClick={() => setSelectedFund(fund)}
                  className={cn(
                    "w-full text-left rounded-lg p-3 transition-colors mb-1",
                    selectedFund?.id === fund.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{fund.code}</span>
                    <Badge variant="outline" className="text-[10px]">{fund.assetsCount} actifs</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{fund.name}</p>
                  <p className="text-xs text-muted-foreground">{formatAUM(fund.aum)}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right — Fund detail + Assets */}
        <main className="flex-1 overflow-y-auto p-6">
          {!selectedFund ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Building2 className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">Selectionnez un fonds pour gerer ses actifs</p>
            </div>
          ) : (
            <div className="max-w-3xl">
              {/* Fund header */}
              <Card className="mb-6">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{selectedFund.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Code: {selectedFund.code} &middot; {formatAUM(selectedFund.aum)} &middot; {selectedFund.currency}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-foreground">{assets.length}</p>
                      <p className="text-xs text-muted-foreground">actifs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assets */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground">Actifs du fonds</h3>
                <Button size="sm" className="gap-1" onClick={() => setShowAssetForm(true)}>
                  <Plus className="h-4 w-4" />
                  Ajouter un actif
                </Button>
              </div>

              {/* New asset form */}
              {showAssetForm && (
                <Card className="mb-4 border-accent/30">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium mb-3">Nouvel actif</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Identifiant</Label>
                        <Input placeholder="Ex: WP003" value={assetForm.assetId} onChange={(e) => setAssetForm({ ...assetForm, assetId: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Nom de l&apos;actif</Label>
                        <Input placeholder="Ex: Westpark Plaza" value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Ville / Localisation</Label>
                        <Input placeholder="Ex: Frankfurt" value={assetForm.location} onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Type d&apos;actif</Label>
                        <Select value={assetForm.assetType} onValueChange={(v) => setAssetForm({ ...assetForm, assetType: v })}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ASSET_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Surface (m2)</Label>
                        <Input type="number" placeholder="Ex: 42000" value={assetForm.areaSqm} onChange={(e) => setAssetForm({ ...assetForm, areaSqm: e.target.value })} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="gap-1" onClick={handleCreateAsset} disabled={!assetForm.assetId || !assetForm.name}>
                        <Save className="h-3.5 w-3.5" />Creer l&apos;actif
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAssetForm(false)}>Annuler</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Assets list */}
              {assets.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Aucun actif dans ce fonds</p>
                    <p className="text-xs mt-1">Cliquez sur &quot;Ajouter un actif&quot; pour commencer</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actif</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ville</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Surface</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {assets.map((asset) => (
                          <tr key={asset.assetId} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{asset.assetId}</td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-foreground">{asset.name}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{asset.location}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs">{asset.assetType}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-mono">
                              {asset.areaSqm ? `${asset.areaSqm.toLocaleString("fr-FR")} m2` : "-"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteAsset(asset.assetId)}>
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
