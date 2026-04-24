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
    <div className="card-interactive rounded-xl border bg-card flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,hsl(24_100%_55%/0.04),transparent_60%)] pointer-events-none" />

      <div className="relative h-14 w-14 rounded-2xl bg-primary-light ring-1 ring-primary/20 flex items-center justify-center mb-5" style={{ animation: 'float 4s ease-in-out infinite' }}>
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-base font-bold mb-2 relative font-[family-name:var(--font-display)]">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[280px] mb-5 relative leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-glow relative inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold cursor-pointer"
        >
          {action.label}
        </button>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

export { EmptyState }
