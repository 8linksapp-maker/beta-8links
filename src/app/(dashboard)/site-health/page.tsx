"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import {
  CheckCircle2, AlertTriangle, XCircle,
  Shield, Sparkles, Zap, ArrowRight,
  Image, FileText, Link2, Globe, Smartphone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NumberTicker } from "@/components/ui/number-ticker";

/* ---------- MOCK DATA ---------- */

type CheckStatus = "ok" | "warning" | "error";

interface HealthCheck {
  label: string;
  status: CheckStatus;
  detail?: string;
  action?: { label: string; icon: React.ReactNode };
}

const healthChecks: HealthCheck[] = [
  {
    label: "HTTPS ativo",
    status: "ok",
  },
  {
    label: "Mobile friendly",
    status: "ok",
  },
  {
    label: "Velocidade: 3.2s (ideal < 2.5s)",
    status: "warning",
    detail: "Compacte imagens e ative cache do navegador para melhorar o tempo de carregamento.",
  },
  {
    label: "3 paginas com erro 404",
    status: "error",
    action: {
      label: "Redirecionar",
      icon: <ArrowRight className="w-3.5 h-3.5" />,
    },
  },
  {
    label: "5 sem meta description",
    status: "error",
    action: {
      label: "Gerar com IA",
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
  },
  {
    label: "Sitemap desatualizado",
    status: "warning",
    action: {
      label: "Atualizar",
      icon: <Globe className="w-3.5 h-3.5" />,
    },
  },
  {
    label: "Robots.txt OK",
    status: "ok",
  },
  {
    label: "12 imagens sem alt text",
    status: "warning",
    action: {
      label: "Gerar alt text",
      icon: <Image className="w-3.5 h-3.5" />,
    },
  },
  {
    label: "Schema markup (FAQ, HowTo)",
    status: "ok",
  },
  {
    label: "2 redirect chains",
    status: "error",
    action: {
      label: "Corrigir",
      icon: <Link2 className="w-3.5 h-3.5" />,
    },
  },
];

const technicalScore = 68;
const okCount = healthChecks.filter((c) => c.status === "ok").length;
const warningCount = healthChecks.filter((c) => c.status === "warning").length;
const errorCount = healthChecks.filter((c) => c.status === "error").length;

/* ---------- HELPERS ---------- */

function getStatusIcon(status: CheckStatus) {
  switch (status) {
    case "ok":
      return <CheckCircle2 className="w-5 h-5 text-success" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-warning" />;
    case "error":
      return <XCircle className="w-5 h-5 text-destructive" />;
  }
}

function getStatusBg(status: CheckStatus) {
  switch (status) {
    case "ok":
      return "border-success/10 bg-success/[0.03]";
    case "warning":
      return "border-warning/10 bg-warning/[0.03]";
    case "error":
      return "border-destructive/10 bg-destructive/[0.03]";
  }
}

function getScoreVariant(score: number) {
  if (score >= 80) return "success" as const;
  if (score >= 60) return "warning" as const;
  return "danger" as const;
}

/* ---------- PAGE ---------- */

export default function SiteHealthPage() {
  const [dbAudit, setDbAudit] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: sites } = await supabase.from("client_sites").select("id").eq("user_id", user.id).limit(1);
      if (!sites?.[0]) return;
      const { data: audits } = await supabase.from("site_audits").select("*").eq("client_site_id", sites[0].id).order("audited_at", { ascending: false }).limit(1);
      if (audits?.[0]) setDbAudit(audits[0]);
    }
    load();
  }, []);
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
          <h1 className="page-title">Saude do Site</h1>
          <p className="page-description">
            Diagnostico tecnico e correcoes automaticas
          </p>
        </div>
      </motion.div>

      {/* Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary-light ring-1 ring-primary/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Score Tecnico</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-[family-name:var(--font-display)] tabular-nums text-primary">
                      <NumberTicker value={technicalScore} />
                    </span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                </div>
              </div>

              {/* Mini stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-semibold">{okCount}</span> OK
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-semibold">{warningCount}</span> Avisos
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <XCircle className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-semibold">{errorCount}</span> Erros
                  </span>
                </div>
              </div>
            </div>
            <Progress value={technicalScore} max={100} variant={getScoreVariant(technicalScore)} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Checklist */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Checklist de Saude
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {healthChecks.map((check, i) => (
                <motion.div
                  key={check.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.12 + i * 0.03 }}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/20 ${getStatusBg(
                    check.status
                  )}`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="shrink-0 mt-0.5">
                      {getStatusIcon(check.status)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <span className="text-sm font-semibold">{check.label}</span>
                      {check.detail && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {check.detail}
                        </p>
                      )}
                    </div>
                  </div>

                  {check.action && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 shrink-0"
                    >
                      {check.action.icon}
                      {check.action.label}
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Fix All Button */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="flex justify-center"
      >
        <Button
          size="xl"
          className="gap-3 w-full sm:w-auto shadow-[0_0_32px_hsl(24_100%_55%/0.3)] hover:shadow-[0_0_48px_hsl(24_100%_55%/0.45)]"
        >
          <Zap className="w-5 h-5" />
          Corrigir tudo automaticamente
        </Button>
      </motion.div>
    </div>
  );
}
