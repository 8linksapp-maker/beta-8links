import * as React from "react"
import { cn } from "@/lib/utils"

const alertVariants = {
  default: "border-border bg-card",
  destructive: "border-destructive/30 bg-[hsl(0_80%_60%/0.05)] text-destructive [&_svg]:text-destructive",
  warning: "border-warning/30 bg-warning-light text-warning [&_svg]:text-warning",
  success: "border-success/30 bg-success-light text-success [&_svg]:text-success",
  info: "border-info/30 bg-info-light text-info [&_svg]:text-info",
}

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof alertVariants
}

function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-xl border p-4 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7",
        alertVariants[variant],
        className
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-semibold leading-none tracking-tight text-sm", className)} {...props} />
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn("text-sm opacity-80 [&_p]:leading-relaxed", className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
