"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSite } from "@/lib/hooks/use-site";
import { motion } from "motion/react";
import {
  FileSearch, Sparkles, AlertTriangle, Wand2,
  FileText, BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NumberTicker } from "@/components/ui/number-ticker";
import { EmptyState } from "@/components/ui/empty-state";

/* ---------- TYPES ---------- */

interface AuditedPage {
  url: string;
  score: number;
  problems: string[];
}

/* ---------- HELPERS ---------- */

function getScoreBadge(score: number) {
  if (score >= 80)
    return { variant: "success" as const, label: "Bom" };
  if (score >= 60)
    return { variant: "warning" as const, label: "Regular" };
  return { variant: "error" as const, label: "Critico" };
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

function getProgressVariant(score: number) {
  if (score >= 80) return "success" as const;
  if (score >= 60) return "warning" as const;
  return "danger" as const;
}

/* ---------- PAGE ---------- */

export default function ContentAuditPage() {
  const { activeSiteId, loading: siteLoading } = useSite();
  const [dbAuditedPages, setDbAuditedPages] = useState<AuditedPage[]>([]);
  const [dbTotalPages, setDbTotalPages] = useState<number | null>(null);

  useEffect(() => {
    if (siteLoading || !activeSiteId) return;

    async function load() {
      const supabase = createClient();

      // Fetch audits for this site
      const { data: audits } = await supabase
        .from("site_audits")
        .select("*")
        .eq("site_id", activeSiteId)
        .order("score", { ascending: true });

      if (audits && audits.length > 0) {
        setDbAuditedPages(
          audits.map((a: any) => ({
            url: a.url ?? a.page_url ?? "",
            score: a.score ?? 0,
            problems: a.problems ?? [],
          }))
        );
        setDbTotalPages(audits.length);
      }
    }
    load();
  }, [activeSiteId, siteLoading]);

  const auditedPages = dbAuditedPages;
  const totalPages = dbTotalPages ?? 0;
  const overallScore = Math.round(
    auditedPages.reduce((sum, p) => sum + p.score, 0) / auditedPages.length
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title">Auditoria de Conteudo</h1>
          <p className="page-description">
            Analise e otimize suas paginas existentes
          </p>
        </div>
      </motion.div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary-light ring-1 ring-primary/20 flex items-center justify-center">
                  <FileSearch className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground font-semibold">
                      <NumberTicker value={totalPages} /> paginas analisadas
                    </span>
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Score geral:
                    </span>
                    <span
                      className={`text-2xl font-black font-[family-name:var(--font-display)] tabular-nums ${getScoreColor(
                        overallScore
                      )}`}
                    >
                      {overallScore}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Progress
                  value={overallScore}
                  max={100}
                  variant={getProgressVariant(overallScore)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pages List */}
      <div className="space-y-4">
        {auditedPages.map((page, i) => {
          const badge = getScoreBadge(page.score);

          return (
            <motion.div
              key={page.url}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.05 }}
            >
              <Card className="card-interactive hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4">
                    {/* Top: URL + Score */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="font-mono text-sm truncate text-muted-foreground">
                          {page.url}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xl font-black font-[family-name:var(--font-display)] tabular-nums ${getScoreColor(
                              page.score
                            )}`}
                          >
                            {page.score}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            /100
                          </span>
                        </div>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                    </div>

                    {/* Problems */}
                    {page.problems.length > 0 && (
                      <div className="space-y-1.5 pl-1">
                        {page.problems.map((problem, j) => (
                          <div
                            key={j}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                            <span>{problem}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" className="gap-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        Reescrever com IA
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Wand2 className="w-3.5 h-3.5" />
                        Otimizar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Footer hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <BarChart3 className="w-3.5 h-3.5 text-primary" />
        <span>
          Mostrando as 5 paginas com maior potencial de melhoria. Restam{" "}
          <span className="text-foreground font-semibold">18 paginas</span>{" "}
          na fila de analise.
        </span>
      </motion.div>
    </div>
  );
}
