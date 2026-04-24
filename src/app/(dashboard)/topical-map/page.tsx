"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSite } from "@/lib/hooks/use-site";
import { motion } from "motion/react";
import {
  Map, CheckCircle2, Flame, Sparkles,
  Search, BrainCircuit, TrendingUp, Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NumberTicker } from "@/components/ui/number-ticker";

/* ---------- MOCK DATA ---------- */

interface CoveredTopic {
  name: string;
  articleCount: number;
  keywords: string[];
}

interface OpportunityTopic {
  keyword: string;
  volume: number;
  source: "google" | "ai-gap";
  highVolume: boolean;
}

const coveredTopics: CoveredTopic[] = [
  {
    name: "Notebooks Gamer",
    articleCount: 7,
    keywords: ["notebook gamer barato", "melhor notebook custo beneficio", "notebook para jogos"],
  },
  {
    name: "Montagem de PC",
    articleCount: 4,
    keywords: ["como montar um pc gamer", "pecas para pc gamer"],
  },
  {
    name: "Perifericos",
    articleCount: 3,
    keywords: ["teclado mecanico", "headset gamer", "mouse gamer"],
  },
];

const opportunities: OpportunityTopic[] = [
  { keyword: "melhor monitor ultrawide para trabalho", volume: 8100, source: "google", highVolume: true },
  { keyword: "notebook vs desktop para programar", volume: 12400, source: "google", highVolume: true },
  { keyword: "como escolher placa mae", volume: 6700, source: "google", highVolume: false },
  { keyword: "cadeira gamer vs ergonomica", volume: 14200, source: "ai-gap", highVolume: true },
  { keyword: "setup home office produtivo", volume: 5300, source: "ai-gap", highVolume: false },
];

const coveragePercent = 30;
const totalCoveredArticles = coveredTopics.reduce((sum, t) => sum + t.articleCount, 0);

/* ---------- PAGE ---------- */

export default function TopicalMapPage() {
  const { activeSiteId, loading: siteLoading } = useSite();
  const [dbArticles, setDbArticles] = useState<string[]>([]);

  useEffect(() => {
    if (siteLoading || !activeSiteId) return;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("articles").select("keyword").eq("client_site_id", activeSiteId).eq("status", "published");
      if (data) setDbArticles(data.map(a => a.keyword));
    }
    load();
  }, [activeSiteId, siteLoading]);

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
          <h1 className="page-title">Mapa de Conteudo</h1>
          <p className="page-description">
            Descubra oportunidades no seu nicho
          </p>
        </div>
      </motion.div>

      {/* Coverage Card (Gamification) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Map className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">
                Cobertura do nicho
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                Voce cobre{" "}
                <span className="text-foreground font-semibold">
                  <NumberTicker value={totalCoveredArticles} /> artigos
                </span>{" "}
                em {coveredTopics.length} topicos
              </span>
              <span className="font-mono font-semibold text-primary">
                {coveragePercent}%
              </span>
            </div>
            <Progress value={coveragePercent} max={100} />
            <p className="text-xs text-muted-foreground mt-2">
              Cubra mais topicos para dominar seu nicho —{" "}
              <span className="text-primary font-semibold">
                70% de oportunidades
              </span>{" "}
              ainda estao abertas
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Topics Already Covered */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Topicos que voce JA cobre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {coveredTopics.map((topic, i) => (
                <motion.div
                  key={topic.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.12 + i * 0.04 }}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      <span className="text-sm font-bold font-[family-name:var(--font-display)]">
                        {topic.name}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-6">
                      {topic.keywords.map((kw) => (
                        <Badge
                          key={kw}
                          variant="outline"
                          className="text-[10px] px-2 py-0 font-mono"
                        >
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge variant="success" className="shrink-0 font-mono text-[10px]">
                    {topic.articleCount} artigos
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Opportunities */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Topicos que voce DEVERIA cobrir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {opportunities.map((opp, i) => (
                <motion.div
                  key={opp.keyword}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.22 + i * 0.04 }}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {opp.highVolume && (
                        <Flame className="w-4 h-4 text-primary shrink-0" />
                      )}
                      <span className="text-sm font-semibold truncate">
                        {opp.keyword}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Search className="w-3 h-3" />
                        {opp.volume.toLocaleString("pt-BR")} buscas/mes
                      </span>
                      <Badge
                        variant={opp.source === "google" ? "outline" : "info"}
                        className="text-[10px] px-2 py-0"
                      >
                        {opp.source === "google" ? (
                          <span className="flex items-center gap-1">
                            <Search className="w-2.5 h-2.5" />
                            Google
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <BrainCircuit className="w-2.5 h-2.5" />
                            Gap de IA
                          </span>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" className="gap-2 shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                    Criar artigo com IA
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Plus className="w-3.5 h-3.5 text-primary" />
        <span>
          Oportunidades atualizadas diariamente com base no Google e analise de IA.
        </span>
      </motion.div>
    </div>
  );
}
