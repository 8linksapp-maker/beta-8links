"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Loader2, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSite } from "@/lib/hooks/use-site";

export default function KeywordChangesPage() {
  const { activeSiteId, activeSite, loading: siteLoading } = useSite();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (siteLoading || !activeSiteId) return;
    setLoading(true);
    fetch(`/api/integrations/gsc-keyword-changes?siteId=${activeSiteId}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeSiteId, siteLoading]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <h1 className="page-title">Keywords em movimento</h1>
        <p className="page-description">Comparação de posições: últimos 30 dias vs 30 dias anteriores</p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !data ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Conecte o Google Search Console para ver as mudanças de posição.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subiram */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-success" /> Subiram de posição
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-mono bg-success/10 text-success border-success/30">{data.totalUp} keywords</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {data.movedUp?.length > 0 ? (
                  <div className="space-y-1">
                    {data.movedUp.map((kw: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <span className="text-sm truncate flex-1">{kw.keyword}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] font-mono text-muted-foreground line-through">#{Math.round(kw.previousPosition)}</span>
                          <ArrowUpRight className="w-3 h-3 text-success" />
                          <span className="text-xs font-mono font-bold text-success">#{Math.round(kw.position)}</span>
                          <Badge variant="outline" className="text-[9px] font-mono bg-success/10 text-success border-success/30">+{Math.round(kw.change)}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma keyword subiu</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Desceram */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-destructive" /> Desceram de posição
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-mono bg-destructive/10 text-destructive border-destructive/30">{data.totalDown} keywords</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {data.movedDown?.length > 0 ? (
                  <div className="space-y-1">
                    {data.movedDown.map((kw: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <span className="text-sm truncate flex-1">{kw.keyword}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] font-mono text-muted-foreground line-through">#{Math.round(kw.previousPosition)}</span>
                          <ArrowDownRight className="w-3 h-3 text-destructive" />
                          <span className="text-xs font-mono font-bold text-destructive">#{Math.round(kw.position)}</span>
                          <Badge variant="outline" className="text-[9px] font-mono bg-destructive/10 text-destructive border-destructive/30">{Math.round(kw.change)}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma keyword desceu</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Oportunidades */}
          {data.opportunities?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-warning" /> Oportunidades — quase na página 1
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.opportunities.map((kw: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-warning/5 border border-warning/10">
                        <p className="text-sm font-medium">{kw.keyword}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-muted-foreground">
                          <span>Posição <span className="font-bold text-warning">#{Math.round(kw.position)}</span></span>
                          <span>{kw.clicks} cliques</span>
                          <span>{kw.impressions.toLocaleString()} impressões</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
