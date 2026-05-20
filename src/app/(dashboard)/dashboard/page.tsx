"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles, Plus, Search, FileText, Link as LinkIcon,
  Check, ArrowRight, Loader2, Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/hooks/use-user";
import { useSite } from "@/lib/hooks/use-site";
import { createClient } from "@/lib/supabase/client";

type RecentItem = {
  id: string;
  type: "backlink" | "article";
  title: string;
  status: string;
  created_at: string;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function DashboardPage() {
  const { profile } = useUser();
  const { activeSite, sites, loading: sitesLoading } = useSite();
  const [stats, setStats] = useState({ keywords: 0, backlinks: 0, articles: 0 });
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userName = profile?.name?.split(" ")[0] || profile?.email?.split("@")[0] || "";

  useEffect(() => {
    if (sitesLoading || !activeSite) { setLoading(false); return; }

    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [
        { count: kwCount },
        { count: blCount },
        { count: artCount },
        { data: recentBl },
        { data: recentArt },
      ] = await Promise.all([
        supabase.from("keywords").select("id", { count: "exact", head: true }).eq("client_site_id", activeSite.id),
        supabase.from("backlinks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("backlinks").select("id, anchor_text, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("articles").select("id, title, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        keywords: kwCount ?? 0,
        backlinks: blCount ?? 0,
        articles: artCount ?? 0,
      });

      const merged: RecentItem[] = [
        ...(recentBl ?? []).map((b: any) => ({ id: b.id, type: "backlink" as const, title: b.anchor_text, status: b.status, created_at: b.created_at })),
        ...(recentArt ?? []).map((a: any) => ({ id: a.id, type: "article" as const, title: a.title || "Sem título", status: a.status, created_at: a.created_at })),
      ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

      setRecent(merged);
      setLoading(false);
    })();
  }, [activeSite, sitesLoading]);

  if (sitesLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEmpty = stats.keywords === 0 && stats.backlinks === 0 && stats.articles === 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-display)] tracking-tight">
          {getGreeting()}{userName ? `, ${userName}` : ""}!
        </h1>
        <p className="text-base text-muted-foreground mt-2 leading-relaxed">
          {isEmpty
            ? "Vamos posicionar seu site no Google."
            : "Aqui está como o seu site está indo."}
        </p>
      </div>

      {/* Hero — primary CTA */}
      <Card className="border-primary/20">
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold font-[family-name:var(--font-display)] tracking-tight mb-2">
                {isEmpty ? "Adicione sua primeira palavra" : "Posicione mais palavras"}
              </h2>
              <p className="text-base text-muted-foreground mb-5 sm:mb-0 leading-relaxed">
                {isEmpty
                  ? "As palavras que você quer aparecer no Google. Depois você cria backlinks e artigos pra cada uma."
                  : "Quanto mais palavras no seu plano, mais oportunidades de aparecer no Google."}
              </p>
            </div>
            <Link href="/palavras">
              <Button size="xl" className="shrink-0 gap-2 w-full sm:w-auto">
                <Plus className="w-5 h-5" /> {isEmpty ? "Adicionar palavra" : "Adicionar mais"}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard icon={Search} label="Palavras no plano" value={stats.keywords} href="/palavras" color="text-primary" />
        <KpiCard icon={LinkIcon} label="Backlinks" value={stats.backlinks} href="/backlinks" color="text-info" />
        <KpiCard icon={FileText} label="Artigos" value={stats.articles} href="/articles" color="text-success" />
      </div>

      {/* Recent activity + checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-base font-bold mb-5">Atividade recente</h3>
              {recent.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-base text-muted-foreground mb-1">Nada por aqui ainda</p>
                  <p className="text-sm text-muted-foreground">Os backlinks e artigos que você criar aparecem aqui.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recent.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted/30">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === "backlink" ? "bg-info-light text-info" : "bg-success-light text-success"
                      }`}>
                        {item.type === "backlink" ? <LinkIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.type === "backlink" ? "Backlink" : "Artigo"} · {translateStatus(item.status)} · {timeAgo(item.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-base font-bold mb-5">Próximos passos</h3>
              <div className="space-y-2.5">
                <ChecklistItem
                  done={sites.length > 0}
                  label="Site cadastrado"
                />
                <ChecklistItem
                  done={stats.keywords > 0}
                  label="Adicionar primeira palavra"
                  href={stats.keywords > 0 ? undefined : "/palavras"}
                />
                <ChecklistItem
                  done={stats.backlinks > 0}
                  label="Criar primeiro backlink"
                  href={stats.backlinks > 0 ? undefined : "/palavras"}
                />
                <ChecklistItem
                  done={stats.articles > 0}
                  label="Escrever primeiro artigo"
                  href={stats.articles > 0 ? undefined : "/palavras"}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, href, color }: {
  icon: any; label: string; value: number; href: string; color: string;
}) {
  return (
    <Link href={href}>
      <Card className="card-interactive hover:border-primary/30 transition-colors cursor-pointer">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <span className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider font-mono font-semibold">{label}</span>
          </div>
          <p className={`text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-display)] tabular-nums ${color}`}>{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function ChecklistItem({ done, label, href }: { done: boolean; label: string; href?: string }) {
  const inner = (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${href && !done ? "hover:bg-muted/30 cursor-pointer" : ""}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
        done ? "bg-success/15 text-success" : "border-2 border-border"
      }`}>
        {done && <Check className="w-3.5 h-3.5" />}
      </div>
      <span className={`text-sm flex-1 ${done ? "text-muted-foreground line-through" : "font-medium"}`}>
        {label}
      </span>
      {!done && href && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
    </div>
  );
  return href && !done ? <Link href={href}>{inner}</Link> : inner;
}

function translateStatus(s: string): string {
  const map: Record<string, string> = {
    queued: "Na fila",
    generating: "Gerando",
    ready_for_review: "Aguardando aprovação",
    published: "Publicado",
    indexed: "Indexado",
    error: "Erro",
    draft: "Rascunho",
    optimizing: "Otimizando",
    ready: "Pronto",
    scheduled: "Agendado",
  };
  return map[s] ?? s;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
