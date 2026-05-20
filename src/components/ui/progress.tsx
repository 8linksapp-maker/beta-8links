import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number
  max?: number
  variant?: "default" | "success" | "warning" | "danger"
  className?: string
}

function Progress({ value, max = 100, variant = "default", className }: ProgressProps) {
  const pct = Math.min(100, (value / max) * 100)

  const barColors = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger:  "bg-destructive",
  }

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-out", barColors[variant])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export { Progress }
