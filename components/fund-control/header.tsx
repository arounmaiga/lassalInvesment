import { Building2, ChevronDown, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AssetInfo } from "@/lib/fund-control-data"
import { formatCurrency } from "@/lib/fund-control-data"

interface HeaderProps {
  asset: AssetInfo
}

export function Header({ asset }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left - Asset Info */}
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">
                {asset.name}
              </h1>
              <span className="text-sm text-muted-foreground">
                — {asset.location}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{asset.fund}</p>
          </div>
        </div>

        {/* Center - Key Metrics */}
        <div className="hidden items-center gap-8 lg:flex">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Valeur Expert
            </p>
            <p className="font-mono text-lg font-semibold text-foreground">
              {formatCurrency(asset.expertValue)}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Valeur Compta
            </p>
            <p className="font-mono text-lg font-semibold text-foreground">
              {formatCurrency(asset.comptaValue)}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Controls
            </p>
            <p className="text-lg font-semibold text-foreground">
              <span className="text-emerald-600">{asset.completedControls}</span>
              <span className="text-muted-foreground">/{asset.totalControls}</span>
            </p>
          </div>
        </div>

        {/* Right - Quarter Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              {asset.quarter}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Q4 2025</DropdownMenuItem>
            <DropdownMenuItem>Q3 2025</DropdownMenuItem>
            <DropdownMenuItem>Q2 2025</DropdownMenuItem>
            <DropdownMenuItem>Q1 2025</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
