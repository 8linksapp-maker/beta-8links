import { cn } from "@/lib/utils"

const sizeMap = {
  sm: { container: "w-8 h-8 rounded-lg",   mark: "text-sm",  wordmark: "text-sm font-extrabold" },
  md: { container: "w-10 h-10 rounded-xl",  mark: "text-base", wordmark: "text-base font-extrabold" },
  lg: { container: "w-12 h-12 rounded-2xl", mark: "text-xl",  wordmark: "text-2xl font-extrabold" },
} as const

type LogoSize    = keyof typeof sizeMap
type LogoVariant = "mark" | "wordmark" | "full"

interface LogoProps {
  size?:      LogoSize
  variant?:   LogoVariant
  className?: string
}

function Logo({ size = "md", variant = "full", className }: LogoProps) {
  const s = sizeMap[size]

  const mark = (
    <div className={cn("bg-primary flex items-center justify-center shrink-0", s.container)}>
      <span className={cn("text-primary-foreground font-extrabold font-[family-name:var(--font-display)] leading-none", s.mark)}>
        8
      </span>
    </div>
  )

  const wordmark = (
    <span className={cn("font-extrabold font-[family-name:var(--font-display)] tracking-tight", s.wordmark)}>
      8links
    </span>
  )

  if (variant === "mark")     return <div className={className}>{mark}</div>
  if (variant === "wordmark") return <div className={className}>{wordmark}</div>
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {mark}
      {wordmark}
    </div>
  )
}

export { Logo }
export type { LogoSize, LogoVariant }
