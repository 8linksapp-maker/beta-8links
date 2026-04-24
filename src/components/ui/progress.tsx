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
    default: "bg-gradient-to-r from-primary to-[hsl(35,100%,60%)]",
    success: "bg-gradient-to-r from-success to-[hsl(152,70%,58%)]",
    warning: "bg-gradient-to-r from-warning to-[hsl(30,100%,55%)]",
    danger:  "bg-gradient-to-r from-destructive to-[hsl(15,90%,55%)]",
  }

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-out relative", barColors[variant])}
        style={{ width: `${pct}%` }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60" />
      </div>
    </div>
  )
}

export { Progress }
