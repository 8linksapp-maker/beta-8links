import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

function Avatar({ className, size = "md", ...props }: AvatarProps) {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-11 w-11 text-sm" }
  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-lg",
        sizes[size],
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  return <img src={src} alt={alt} className={cn("aspect-square h-full w-full object-cover", className)} />
}

function AvatarFallback({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-[hsl(35,100%,60%)] font-bold text-primary-foreground font-[family-name:var(--font-display)]",
      className
    )}>
      {children}
    </div>
  )
}

function AvatarGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex -space-x-2", className)}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ className?: string }>, {
              className: cn((child as React.ReactElement<{ className?: string }>).props.className, "ring-2 ring-background"),
            })
          : child
      )}
    </div>
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup }
