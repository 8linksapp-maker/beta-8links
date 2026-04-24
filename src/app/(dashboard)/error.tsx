"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 ring-1 ring-destructive/20 flex items-center justify-center mb-6">
        <AlertTriangle className="w-7 h-7 text-destructive" />
      </div>
      <h2 className="text-xl font-bold font-[family-name:var(--font-display)] tracking-tight mb-2">
        Algo deu errado
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
          Voltar ao Dashboard
        </Button>
        <Button onClick={() => reset()}>
          Tentar novamente
        </Button>
      </div>
      {error.digest && (
        <p className="text-xs font-mono text-muted-foreground mt-4">
          Código: {error.digest}
        </p>
      )}
    </div>
  );
}
