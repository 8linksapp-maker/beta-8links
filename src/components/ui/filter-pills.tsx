import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterOption {
  id:     string
  label:  string
  count?: number
  icon?:  LucideIcon
}

interface FilterPillsProps {
  options:    FilterOption[]
  value:      string
  onChange:   (id: string) => void
  className?: string
}

function FilterPills({ options, value, onChange, className }: FilterPillsProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {options.map(opt => {
        const Icon   = opt.icon
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5",
                active ? "bg-primary-foreground/20" : "bg-muted"
              )}>
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { FilterPills }
export type { FilterOption }
