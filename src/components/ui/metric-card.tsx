import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { NumberTicker } from "./number-ticker"

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
      "card-beam rounded-xl border bg-card p-5 relative overflow-hidden",
      className
    )}>
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">{label}</span>
        <div className="h-9 w-9 rounded-lg bg-primary-light flex items-center justify-center ring-1 ring-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="metric-number text-foreground relative">
        <NumberTicker value={value} decimalPlaces={decimalPlaces} />
        {suffix && <span className="text-lg text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
      {change && (
        <div className={cn(
          "inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full font-mono",
          change.positive
            ? "text-success bg-success-light"
            : "text-destructive bg-[hsl(0_80%_60%/0.1)]"
        )}>
          {change.positive ? "\u2191" : "\u2193"} {change.value}
        </div>
      )}
    </div>
  )
}

export { MetricCard }
