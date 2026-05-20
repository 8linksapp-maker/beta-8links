import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: number
  suffix?: string
  decimalPlaces?: number
  icon: LucideIcon
  change?: {
    value: string
    positive: boolean
  }
  className?: string
}

function MetricCard({ label, value, suffix, decimalPlaces = 0, icon: Icon, change, className }: MetricCardProps) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-5",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">{label}</span>
        <div className="h-9 w-9 rounded-lg bg-primary-light flex items-center justify-center ring-1 ring-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="metric-number text-foreground">
        <span className="tabular-nums">{decimalPlaces > 0 ? value.toFixed(decimalPlaces) : value}</span>
        {suffix && <span className="text-lg text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
      {change && (
        <div className={cn(
          "inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full font-mono",
          change.positive
            ? "text-success bg-success-light"
            : "text-destructive bg-destructive/10"
        )}>
          {change.positive ? "\u2191" : "\u2193"} {change.value}
        </div>
      )}
    </div>
  )
}

export { MetricCard }
