"use client";

import { Sparkles } from "lucide-react";

export function MigrationBanner() {
  return (
    <div className="shrink-0 mx-4 my-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 sm:px-6">
      <div className="flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs sm:text-sm font-semibold text-foreground">
          Nova atualização! Seus backlinks e sites estão sendo migrados. Nenhum dado foi perdido.
        </p>
      </div>
    </div>
  );
}
