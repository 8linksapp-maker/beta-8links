"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSite } from "@/lib/hooks/use-site";
import { motion } from "motion/react";
import {
  Users,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  AlertTriangle,
  Sparkles,
  Plus,
  Globe,
  Search as SearchIcon,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NumberTicker } from "@/components/ui/number-ticker";
import { StatusTag } from "@/components/ui/status-tag";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Competitor {
  id: number | string;
  domain: string;
  da: number;
  weekActivity: {
    newArticles: number;
    newBacklinks: number;
    keywordMovement: { positions: number; keyword: string };
  };
  missingBacklinks: { domain: string; da: number }[];
  rankingArticles: { title: string; position: number; volume: number; keyword: string }[];
}

interface UserSite {
  domain: string;
  da: number;
}

const CHART_COLORS = {
  user: "hsl(24, 100%, 55%)",
  competitor: "hsl(220, 10%, 40%)",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CompetitorsPage() {
  const { activeSiteId, activeSite, loading: siteLoading } = useSite();
  const [dbUserSite, setDbUserSite] = useState<UserSite | null>(null);
  const [dbCompetitors, setDbCompetitors] = useState<Competitor[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (siteLoading || !activeSiteId) return;

    // Set user site info from the global context
    if (activeSite) {
      setDbUserSite({ domain: (activeSite as any).domain ?? activeSite.url ?? "", da: (activeSite as any).da ?? activeSite.da_current ?? 0 });
    }

    async function load() {
      const supabase = createClient();

      // Fetch competitors for this site
      const { data: compData } = await supabase
        .from("competitors")
        .select("*")
        .eq("site_id", activeSiteId)
        .order("da", { ascending: false });

      if (compData && compData.length > 0) {
        setDbCompetitors(
          compData.map((c: any, i: number) => ({
            id: c.id ?? i + 1,
            domain: c.domain ?? "",
            da: c.da ?? 0,
            weekActivity: {
              newArticles: c.new_articles ?? 0,
              newBacklinks: c.new_backlinks ?? 0,
              keywordMovement: {
                positions: c.keyword_positions ?? 0,
                keyword: c.keyword ?? "",
              },
            },
            missingBacklinks: (c.missing_backlinks ?? []).map((bl: any) => ({
              domain: bl.domain ?? "",
              da: bl.da ?? 0,
            })),
            rankingArticles: (c.ranking_articles ?? []).map((a: any) => ({
              title: a.title ?? "",
              position: a.position ?? 0,
              volume: a.volume ?? 0,
              keyword: a.keyword ?? "",
            })),
          }))
        );
      }
      setLoaded(true);
    }
    load();
  }, [activeSiteId, siteLoading, activeSite]);

  const USER_SITE = dbUserSite ?? { domain: "", da: 0 };
  const COMPETITORS = dbCompetitors;
  const chartData = [
    { name: "Seu site", da: USER_SITE.da, isUser: true },
    ...COMPETITORS.map((c) => ({
      name: c.domain.replace(".com.br", ""),
      da: c.da,
      isUser: false,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title">Concorrentes</h1>
          <p className="page-description">
            Espione o que seus concorrentes estao fazendo
          </p>
        </div>
      </motion.div>

      {loaded && COMPETITORS.length === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="Nenhum concorrente monitorado ainda"
          description="Adicione concorrentes para espionar suas estrategias de SEO e backlinks."
        />
      )}

      {COMPETITORS.length > 0 && (<>
      {/* ---- DA Comparison Chart ---- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <CardTitle>Comparacao de Domain Authority</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(220, 10%, 18%)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 70]}
                    tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(220, 10%, 20%)" }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fill: "hsl(220, 10%, 65%)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(220, 15%, 12%)",
                      border: "1px solid hsl(220, 10%, 20%)",
                      borderRadius: "8px",
                      color: "hsl(220, 10%, 85%)",
                      fontSize: "13px",
                    }}
                    formatter={(value) => [`AP ${value}`, ""]}
                    cursor={{ fill: "hsl(220, 10%, 15%)" }}
                  />
                  <Bar dataKey="da" radius={[0, 6, 6, 0]} barSize={28}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.isUser
                            ? CHART_COLORS.user
                            : CHART_COLORS.competitor
                        }
                        opacity={entry.isUser ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle" style={{ background: CHART_COLORS.user }} />
              Seu site
              <span className="inline-block w-2.5 h-2.5 rounded-sm mx-1.5 ml-4 align-middle" style={{ background: CHART_COLORS.competitor, opacity: 0.6 }} />
              Concorrentes
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---- Competitor Cards ---- */}
      <div className="space-y-5">
        {COMPETITORS.map((competitor, i) => {
          const daGap = competitor.da - USER_SITE.da;

          return (
            <motion.div
              key={competitor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 + i * 0.06 }}
            >
              <Card className="card-interactive hover:border-primary/30">
                <CardContent className="p-5 space-y-5">
                  {/* ---- Domain + DA ---- */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold font-[family-name:var(--font-display)]">
                          {competitor.domain}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-2 py-0">
                            AP {competitor.da}
                          </Badge>
                          <Badge variant="warning" className="text-[10px] px-2 py-0">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            gap: {daGap} pontos
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <StatusTag status="active" label="Monitorando" />
                  </div>

                  {/* ---- Weekly Activity ---- */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <p className="text-xs font-semibold text-foreground/80 mb-2">
                      Essa semana ele:
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>
                        Publicou{" "}
                        <span className="font-semibold text-foreground">
                          {competitor.weekActivity.newArticles} artigos novos
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <LinkIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>
                        Ganhou{" "}
                        <span className="font-semibold text-foreground">
                          {competitor.weekActivity.newBacklinks} backlinks
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>
                        Subiu{" "}
                        <span className="font-semibold text-foreground">
                          {competitor.weekActivity.keywordMovement.positions}{" "}
                          posicoes
                        </span>{" "}
                        para{" "}
                        <span className="font-semibold text-primary">
                          &ldquo;{competitor.weekActivity.keywordMovement.keyword}&rdquo;
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* ---- Missing Backlinks ---- */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs font-semibold text-foreground/80">
                        Backlinks que ele tem e voce nao:
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {competitor.missingBacklinks.map((bl) => (
                        <div
                          key={bl.domain}
                          className="flex items-center gap-2 text-xs text-muted-foreground pl-1"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="font-mono">{bl.domain}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            AP {bl.da}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" className="mt-1">
                      <Plus className="w-3.5 h-3.5" />
                      Criar backlinks nesses sites
                    </Button>
                  </div>

                  {/* ---- Missing Articles ---- */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <p className="text-xs font-semibold text-foreground/80">
                        Artigos que rankeiam e voce nao tem:
                      </p>
                    </div>
                    <div className="space-y-2">
                      {competitor.rankingArticles.map((article) => (
                        <div
                          key={article.keyword}
                          className="flex items-center justify-between gap-3 text-xs rounded-lg bg-muted/40 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">
                              {article.title}
                            </p>
                            <p className="text-muted-foreground mt-0.5">
                              <span className="font-mono text-primary">
                                #{article.position}
                              </span>
                              {" "}para &ldquo;{article.keyword}&rdquo;
                              <span className="mx-1.5 text-border-strong">|</span>
                              <span className="font-mono">
                                {article.volume.toLocaleString("pt-BR")} buscas/mes
                              </span>
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="mt-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Criar artigo melhor com IA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
      </>)}
    </div>
  );
}
