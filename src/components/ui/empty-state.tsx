import type { LucideIcon } from "lucide-react"
import { Button } from "./button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card-interactive rounded-xl border bg-card flex flex-col items-center justify-center p-12 text-center">
      <div className="h-14 w-14 rounded-2xl bg-primary-light ring-1 ring-primary/20 flex items-center justify-center mb-5">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-base font-bold mb-2 font-[family-name:var(--font-display)]">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[280px] mb-5 leading-relaxed">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="lg">
          {action.label}
        </Button>
      )}
    </div>
  )
}

export { EmptyState }
