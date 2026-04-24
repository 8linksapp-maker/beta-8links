import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: "top" | "bottom"
  className?: string
}

function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [show, setShow] = React.useState(false)

  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={cn(
          "absolute z-50 px-3 py-1.5 rounded-lg bg-popover border border-border-strong text-xs font-medium shadow-xl whitespace-nowrap",
          side === "top" ? "bottom-full mb-2 left-1/2 -translate-x-1/2" : "top-full mt-2 left-1/2 -translate-x-1/2",
          className
        )}>
          {content}
        </div>
      )}
    </div>
  )
}

export { Tooltip }
