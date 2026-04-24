import { cn } from "@/lib/utils"

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

function Switch({ checked, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300",
        checked
          ? "bg-primary shadow-[0_0_12px_hsl(24_100%_55%/0.3)]"
          : "bg-muted",
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform duration-300",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

export { Switch }
