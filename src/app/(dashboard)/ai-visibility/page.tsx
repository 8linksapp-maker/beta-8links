"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSite } from "@/lib/hooks/use-site";
import { motion } from "motion/react";
import {
  Bot, Search, Globe, CheckCircle2, XCircle, TrendingUp,
  Sparkles, ArrowRight, ExternalLink, MessageSquare, Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NumberTicker } from "@/components/ui/number-ticker";
import { StatusTag } from "@/components/ui/status-tag";

/* ───────── TYPES ───────── */

interface Platform {
  name: string;
  emoji: string;
  count: number;
  total: number;
  label: string;
  change: number;
  positive: boolean;
}

interface Appearance {
  query: string;
  platform: string;
  sentiment: string;
  snippet: string;
}

interface Opportunity {
  query: string;
  competitor: string;
  difficulty: string;
}

/* ───────── ANIMATION VARIANTS ───────── */

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
};

/* ───────── PAGE ───────── */

export default function AIVisibilityPage() {
  const { activeSiteId, loading: siteLoading } = useSite();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (siteLoading || !activeSiteId) return;

    async function load() {
      const supabase = createClient();

      // Fetch AI visibility checks
      const { data: checks } = await supabase
        .from("ai_visibility_checks")
        .select("*")
        .eq("site_id", activeSiteId)
        .order("created_at", { ascending: false });

      if (checks && checks.length > 0) {
        // Map platforms
        const platformMap: Record<string, { count: number; total: number; change: number }> = {};
        const cited: Appearance[] = [];
        const notCited: Opportunity[] = [];

        for (const c of checks) {
          const plat = c.platform ?? "ChatGPT";
          if (!platformMap[plat]) platformMap[plat] = { count: 0, total: 0, change: 0 };
          platformMap[plat].total++;
          if (c.cited) {
            platformMap[plat].count++;
            cited.push({
              query: c.query ?? "",
              platform: plat,
              sentiment: c.sentiment ?? "Positivo",
              snippet: c.snippet ?? "",
            });
          } else {
            notCited.push({
              query: c.query ?? "",
              competitor: c.competitor_domain ?? "",
              difficulty: c.difficulty ?? "Media",
            });
          }
        }

        const emojiMap: Record<string, string> = {
          ChatGPT: "🤖", Perplexity: "🔍", "Google AI Overview": "🌐", Gemini: "✨",
        };
        const labelMap: Record<string, string> = {
          ChatGPT: "mencoes", Perplexity: "citacoes", "Google AI Overview": "keywords", Gemini: "mencoes",
        };

        const mappedPlatforms = Object.entries(platformMap).map(([name, v]) => ({
          name,
          emoji: emojiMap[name] ?? "🤖",
          count: v.count,
          total: v.total,
          label: labelMap[name] ?? "mencoes",
          change: v.change,
          positive: v.count > 0,
        }));

        setPlatforms(mappedPlatforms);
        setAppearances(cited);
        setOpportunities(notCited);
      }
      setLoaded(true);
    }
    load();
  }, [activeSiteId, siteLoading]);

  const hasData = platforms.length > 0 || appearances.length > 0 || opportunities.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <div className="page-header mb-6">
          <div>
            <h1 className="page-title">Visibilidade IA</h1>
            <p className="page-description">
              Monitore sua presenca no ChatGPT, Perplexity e Gemini
            </p>
          </div>
        </div>
      </motion.div>

      {loaded && !hasData && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bot className="w-10 h-10 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            Nenhuma verificacao de IA realizada ainda. Configure nas configuracoes.
          </p>
        </div>
      )}

      {hasData && (<>
      {/* AI Score Card */}
      <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.05 }}>
        <div className="card-beam rounded-xl border bg-card p-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2">
                Pontuacao IA
              </p>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-black font-[family-name:var(--font-display)] tracking-tight text-gradient">
                  <NumberTicker value={34} />
                </span>
                <span className="text-lg text-muted-foreground mb-1">/100</span>
                <span className="text-xs font-semibold text-warning bg-warning-light px-2 py-0.5 rounded-full font-mono mb-2">
                  em progresso
                </span>
              </div>
            </div>

            <div className="sm:text-right">
              <p className="text-sm text-muted-foreground">
                Seu site e citado em{" "}
                <span className="text-foreground font-semibold">28</span> de{" "}
                <span className="text-foreground font-semibold">160</span> verificacoes
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Continue criando conteudo de qualidade para aumentar
              </p>
            </div>
          </div>

          <div className="mt-5">
            <Progress value={34} variant="default" />
          </div>
        </div>
      </motion.div>

      {/* Platform Cards */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {platforms.map((p, i) => (
          <div
            key={i}
            className="card-interactive rounded-xl border bg-card p-5 relative overflow-hidden"
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-3 relative">
              <span className="text-lg">{p.emoji}</span>
              {p.change > 0 ? (
                <span className="text-xs font-semibold text-success bg-success-light px-2 py-0.5 rounded-full font-mono">
                  ↑{p.change}
                </span>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
                  ={p.change}
                </span>
              )}
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-1">
              {p.name}
            </p>
            <div className="flex items-end gap-1 mb-3">
              <span className="text-2xl font-bold font-[family-name:var(--font-display)] tracking-tight">
                <NumberTicker value={p.count} />
              </span>
              <span className="text-sm text-muted-foreground mb-0.5">/{p.total}</span>
              <span className="text-xs text-muted-foreground mb-0.5 ml-1">{p.label}</span>
            </div>

            <Progress value={p.count} max={p.total} variant={p.count > 10 ? "success" : "default"} className="h-1.5" />
          </div>
        ))}
      </motion.div>

      {/* Two Columns: Appearances + Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Where you appear */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Onde voce aparece
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {appearances.map((item, i) => (
                  <div
                    key={i}
                    className="py-3 border-b border-border last:border-0"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">
                          &ldquo;{item.query}&rdquo;
                        </p>

                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px] px-2 py-0">
                            {item.platform}
                          </Badge>
                          <Badge variant="success" className="text-[10px] px-2 py-0">
                            {item.sentiment}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed">
                          {item.snippet}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Opportunities */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Oportunidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {opportunities.map((item, i) => (
                  <div
                    key={i}
                    className="py-3 border-b border-border last:border-0"
                  >
                    <div className="flex items-start gap-3">
                      <XCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">
                          &ldquo;{item.query}&rdquo;
                        </p>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground">
                            Quem aparece:{" "}
                            <span className="text-foreground font-medium">{item.competitor}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2.5">
                          <Badge
                            variant={
                              item.difficulty === "Facil"
                                ? "success"
                                : item.difficulty === "Media"
                                ? "warning"
                                : "error"
                            }
                            className="text-[10px] px-2 py-0"
                          >
                            {item.difficulty}
                          </Badge>
                          <Button variant="default" size="sm" className="h-7 text-xs gap-1.5">
                            <Sparkles className="w-3 h-3" />
                            Criar artigo com IA
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      </>)}
    </div>
  );
}
