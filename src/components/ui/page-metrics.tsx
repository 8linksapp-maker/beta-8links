"use client";

import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PageMetric = {
  label: string;
  value: number;
  icon: LucideIcon;
  format?: "integer" | "decimal";
  trend?: { delta: number; label?: string };
  hint?: string;
  accent?: boolean;
  /** Optional CTA shown below the number — useful for "connect to enable this metric" prompts. */
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
};

interface PageMetricsProps {
  items: PageMetric[];
  loading?: boolean;
}

export function PageMetrics({ items, loading }: PageMetricsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-muted/20 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((m, i) => (
        <div key={m.label}>
          <Card
            className={cn(
              "group transition-all duration-300",
              "hover:border-primary/30 hover:-translate-y-0.5",
            )}
          >
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <m.icon className={cn("w-4 h-4", m.accent ? "text-primary" : "text-muted-foreground")} />
                <span className="text-[11px] uppercase tracking-wider font-mono font-semibold text-muted-foreground">
                  {m.label}
                </span>
              </div>

              <div className="flex items-baseline gap-3 flex-wrap">
                <span
                  className={cn(
                    "tabular-nums text-4xl sm:text-5xl font-extrabold font-[family-name:var(--font-display)] tracking-tight leading-none",
                    m.accent ? "text-primary" : "text-foreground"
                  )}
                >
                  {m.format === "decimal" ? m.value.toFixed(1) : m.value}
                </span>
                {m.trend && (
                  <TrendChip delta={m.trend.delta} label={m.trend.label ?? "esta semana"} />
                )}
              </div>

              {m.hint && (
                <p className="relative text-xs text-muted-foreground mt-2 leading-relaxed">
                  {m.hint}
                </p>
              )}

              {m.action && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={m.action.onClick}
                  className="relative mt-3 gap-1.5 h-8"
                >
                  {m.action.icon && <m.action.icon className="w-3.5 h-3.5" />}
                  {m.action.label}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

function TrendChip({ delta, label }: { delta: number; label: string }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground whitespace-nowrap">
        <Minus className="w-3 h-3" /> sem mudança
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
        positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
      )}
    >
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? "+" : ""}
      {delta} {label}
    </span>
  );
}

/**
 * Counts how many items in the array were created in the last N days.
 * Use as the `delta` for a weekly/monthly trend chip.
 */
export function countSince(items: { created_at: string }[], days: number): number {
  const cutoff = Date.now() - days * 86400000;
  let count = 0;
  for (const it of items) {
    if (new Date(it.created_at).getTime() >= cutoff) count++;
  }
  return count;
}
