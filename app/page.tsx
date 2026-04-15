"use client"

import { useState } from "react"
import { LandingPage } from "@/components/fund-control/landing-page"
import { DashboardView } from "@/components/fund-control/dashboard-view"
import { CreateCampaignView } from "@/components/fund-control/create-campaign-view"
import { CampaignDetailView } from "@/components/fund-control/campaign-detail-view"
import { AgentSupervision } from "@/components/fund-control/agent-supervision"
import { AgentObservatory } from "@/components/fund-control/agent-observatory"
import { AdminView } from "@/components/fund-control/admin-view"
import { ControlDesigner } from "@/components/fund-control/control-designer"

export type AppView = "landing" | "dashboard" | "create-campaign" | "campaign-detail" | "agent-supervision" | "agent-observatory" | "admin" | "control-designer"

export interface NavigationState {
  view: AppView
  campaignId?: string
  assetId?: string
}

export default function FundControlApp() {
  const [navState, setNavState] = useState<NavigationState>({ view: "landing" })

  const navigateTo = (view: AppView, params?: { campaignId?: string; assetId?: string }) => {
    setNavState({ view, ...params })
  }

  switch (navState.view) {
    case "landing":
      return <LandingPage onNavigate={navigateTo} />
    case "admin":
      return <AdminView onNavigate={navigateTo} />
    case "control-designer":
      return <ControlDesigner onNavigate={navigateTo} />
    case "agent-supervision":
      return <AgentSupervision onNavigate={navigateTo} />
    case "agent-observatory":
      return <AgentObservatory onNavigate={navigateTo} assetId={navState.assetId} />
    case "create-campaign":
      return <CreateCampaignView onNavigate={navigateTo} />
    case "campaign-detail":
      return (
        <CampaignDetailView
          campaignId={navState.campaignId || "camp1"}
          assetId={navState.assetId}
          onNavigate={navigateTo}
        />
      )
    default:
      return <DashboardView onNavigate={navigateTo} />
  }
}
