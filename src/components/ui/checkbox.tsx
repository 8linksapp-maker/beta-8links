import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface CheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

function Checkbox({ checked, onCheckedChange, disabled, className }: CheckboxProps) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "h-4 w-4 shrink-0 rounded border transition-all duration-200 flex items-center justify-center cursor-pointer",
        checked
          ? "bg-primary border-primary text-primary-foreground shadow-[0_0_8px_hsl(24_100%_55%/0.2)]"
          : "border-border-strong bg-transparent hover:border-primary/50",
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  )
}

export { Checkbox }
