import { cn } from "@/lib/utils"

const statusConfig = {
  live:       { label: "Live",       dotClass: "bg-success dot-pulse",       textClass: "text-success",          bgClass: "bg-success-light" },
  active:     { label: "Active",     dotClass: "bg-success dot-pulse",       textClass: "text-success",          bgClass: "bg-success-light" },
  completed:  { label: "Completed",  dotClass: "bg-success",                textClass: "text-success",          bgClass: "bg-success-light" },
  processing: { label: "Processing", dotClass: "bg-info dot-pulse",          textClass: "text-info",             bgClass: "bg-info-light" },
  pending:    { label: "Pending",    dotClass: "bg-warning",                textClass: "text-warning",          bgClass: "bg-warning-light" },
  paused:     { label: "Paused",     dotClass: "bg-muted-foreground",       textClass: "text-muted-foreground", bgClass: "bg-muted" },
  error:      { label: "Error",      dotClass: "bg-destructive dot-pulse",  textClass: "text-destructive",      bgClass: "bg-[hsl(0_80%_60%/0.1)]" },
} as const

type StatusType = keyof typeof statusConfig

interface StatusTagProps {
  status: StatusType
  label?: string
  className?: string
}

function StatusTag({ status, label, className }: StatusTagProps) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold font-[family-name:var(--font-mono)] tracking-wide",
        config.bgClass,
        config.textClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {label ?? config.label}
    </span>
  )
}

export { StatusTag }
export type { StatusType }
