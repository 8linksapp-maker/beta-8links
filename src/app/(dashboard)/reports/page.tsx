"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3, Download, Mail, Calendar, FileText,
  TrendingUp, Globe, Link as LinkIcon, ArrowRight,
  CheckCircle2, Clock, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const mockReports = [
  { id: 1, type: "monthly", title: "Relatório Mensal — Março 2026", date: "01 Abr 2026", sent: true, highlights: { da: "+3", traffic: "+45%", backlinks: 42, keywords: "+5 top 10" } },
  { id: 2, type: "weekly", title: "Relatório Semanal — 31 Mar - 06 Abr", date: "07 Abr 2026", sent: true, highlights: { da: "+1", traffic: "+12%", backlinks: 12, keywords: "+2 top 10" } },
  { id: 3, type: "weekly", title: "Relatório Semanal — 07 Abr - 13 Abr", date: "14 Abr 2026", sent: false, highlights: { da: "0", traffic: "+8%", backlinks: 10, keywords: "+1 top 10" } },
];

export default function ReportsPage() {
  const [dbReports, setDbReports] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setDbReports(data.map((r: any) => ({
          id: r.id,
          type: r.type || "weekly",
          title: r.title,
          date: new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
          sent: r.sent ?? false,
          highlights: r.highlights || { da: "0", traffic: "0%", backlinks: 0, keywords: "0" },
        })));
      }
    }
    load();
  }, []);

  const reports = dbReports.length > 0 ? dbReports : mockReports;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-description">Relatórios semanais e mensais detalhados</p>
        </div>
        <Button variant="outline" onClick={() => toast.success("PDF gerado!")}><Download className="w-4 h-4" /> Exportar PDF</Button>
      </motion.div>

      {/* Current month summary */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="card-beam relative overflow-hidden">
          <CardContent className="p-6">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">Resumo de Abril 2026</p>
                  <p className="text-xs text-muted-foreground mt-1">Dados acumulados do mês</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs"><Calendar className="w-3 h-3 mr-1" /> Mês atual</Badge>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { icon: TrendingUp, label: "DA", value: "31", sub: "+3 este mês", color: "text-primary" },
                  { icon: Globe, label: "Tráfego", value: "3.400", sub: "+21% vs março", color: "text-success" },
                  { icon: LinkIcon, label: "Backlinks", value: "22", sub: "publicados em abril", color: "text-primary" },
                  { icon: BarChart3, label: "Keywords Top 10", value: "5", sub: "+2 este mês", color: "text-success" },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">{item.label}</span>
                    </div>
                    <p className={`text-2xl font-black font-[family-name:var(--font-display)] tracking-tight ${item.color}`}>
                      <NumberTicker value={parseInt(item.value.replace('.', ''))} />
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                  </div>
                ))}
              </div>

              <Separator className="my-5" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Valor equivalente em Google Ads</p>
                  <p className="text-lg font-bold font-[family-name:var(--font-display)]">R$ <NumberTicker value={4873} /> <span className="text-xs text-muted-foreground font-normal">/mês</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast.success("PDF sendo gerado...")}><Download className="w-3.5 h-3.5" /> PDF</Button>
                  <Button size="sm" onClick={() => toast.success("Email enviado!")}><Mail className="w-3.5 h-3.5" /> Enviar por Email</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Email schedule */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-primary-light border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Relatórios automáticos ativos</p>
                <p className="text-xs text-muted-foreground">Semanal (toda segunda) + Mensal (dia 1)</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Configurar</Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reports list */}
      <div className="space-y-3">
        {reports.map((report, i) => (
          <motion.div key={report.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.05 }}>
            <Card className="card-interactive">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${report.type === "monthly" ? "bg-primary-light" : "bg-muted"}`}>
                      <FileText className={`w-4 h-4 ${report.type === "monthly" ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">{report.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-mono text-muted-foreground">{report.date}</span>
                        {report.sent ? (
                          <Badge variant="success" className="text-[10px]"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Enviado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]"><Clock className="w-2.5 h-2.5 mr-0.5" /> Pendente</Badge>
                        )}
                        <Badge variant={report.type === "monthly" ? "info" : "outline"} className="text-[10px]">
                          {report.type === "monthly" ? "Mensal" : "Semanal"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs text-muted-foreground">Authority: <span className="font-semibold text-foreground">{report.highlights.da}</span></span>
                        <span className="text-xs text-muted-foreground">Tráfego: <span className="font-semibold text-success">{report.highlights.traffic}</span></span>
                        <span className="text-xs text-muted-foreground">Links: <span className="font-semibold text-primary">{report.highlights.backlinks}</span></span>
                        <span className="text-xs text-muted-foreground">Keywords: <span className="font-semibold text-foreground">{report.highlights.keywords}</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
