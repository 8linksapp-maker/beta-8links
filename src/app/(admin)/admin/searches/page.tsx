"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search, RefreshCw, Database, Users, TrendingUp, Clock, Hash,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AdminSearchesPage() {
  const [searches, setSearches] = useState<any[]>([]);
  const [cache, setCache] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [tab, setTab] = useState<"searches" | "cache">("searches");

  const load = async () => {
    setLoading(true);
    const supabase = createClient();

    // Recent searches from usage_tracking
    const { data: usageData } = await supabase
      .from("usage_tracking")
      .select("id, user_id, action, reference_id, created_at")
      .eq("action", "keyword_search")
      .order("created_at", { ascending: false })
      .limit(200);

    // Get user emails for the searches
    const userIds = [...new Set((usageData ?? []).map(u => u.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

    setSearches((usageData ?? []).map(u => ({
      ...u,
      keyword: u.reference_id,
      email: profileMap.get(u.user_id)?.email ?? "—",
      name: profileMap.get(u.user_id)?.name ?? "",
    })));

    // Cached keywords
    const { data: cacheData } = await supabase
      .from("keyword_suggestions_cache")
      .select("id, seed, location_code, created_at, items")
      .order("created_at", { ascending: false })
      .limit(200);

    setCache((cacheData ?? []).map(c => ({
      ...c,
      resultCount: Array.isArray(c.items) ? c.items.length : 0,
    })));

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Stats
  const uniqueUsers = new Set(searches.map(s => s.user_id)).size;
  const uniqueKeywords = new Set(searches.map(s => s.keyword?.toLowerCase())).size;
  const today = new Date().toISOString().split("T")[0];
  const todaySearches = searches.filter(s => s.created_at?.startsWith(today)).length;

  // Top searched keywords
  const kwCounts = new Map<string, number>();
  searches.forEach(s => {
    const kw = s.keyword?.toLowerCase() ?? "";
    if (kw) kwCounts.set(kw, (kwCounts.get(kw) ?? 0) + 1);
  });
  const topKeywords = [...kwCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);

  // Filter
  const filteredSearches = searches.filter(s =>
    !searchFilter || s.keyword?.toLowerCase().includes(searchFilter.toLowerCase()) || s.email?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredCache = cache.filter(c =>
    !searchFilter || c.seed?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Pesquisas de Keywords</h1>
          <p className="text-sm text-muted-foreground">{searches.length} pesquisas · {cache.length} seeds em cache</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={Search} label="Pesquisas total" value={searches.length} />
        <KPI icon={Clock} label="Pesquisas hoje" value={todaySearches} />
        <KPI icon={Users} label="Usuários únicos" value={uniqueUsers} />
        <KPI icon={Database} label="Seeds em cache" value={cache.length} />
      </div>

      {/* Top keywords */}
      {topKeywords.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono mb-3">Keywords mais buscadas</h3>
            <div className="flex flex-wrap gap-1.5">
              {topKeywords.map(([kw, count]) => (
                <span key={kw} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-muted/50 hover:bg-muted transition-colors">
                  {kw} <span className="font-mono font-bold text-primary">{count}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          <button onClick={() => setTab("searches")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${tab === "searches" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            Pesquisas recentes
          </button>
          <button onClick={() => setTab("cache")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${tab === "cache" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            Cache DataForSEO
          </button>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
            placeholder="Filtrar..." className="pl-9 h-8 text-xs" />
        </div>
      </div>

      {/* Searches list */}
      {tab === "searches" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left text-[10px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider font-mono">Keyword</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono">Usuário</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider font-mono">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredSearches.slice(0, 100).map(s => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium text-[13px]">{s.keyword || "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.name || s.email}</td>
                    <td className="px-4 py-2 text-right text-[10px] font-mono text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSearches.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma pesquisa encontrada</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cache list */}
      {tab === "cache" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left text-[10px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider font-mono">Seed</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono">Resultados</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono">Custo evitado</th>
                  <th className="text-right text-[10px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider font-mono">Cacheado em</th>
                </tr>
              </thead>
              <tbody>
                {filteredCache.slice(0, 100).map(c => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium text-[13px]">{c.seed}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{c.resultCount}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-success">$0.012</td>
                    <td className="px-4 py-2 text-right text-[10px] font-mono text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCache.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum seed em cache</p>
            )}
            {cache.length > 0 && (
              <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{cache.length} seeds cacheados</span>
                <span className="font-mono font-bold text-success">
                  Economia total: ${(cache.length * 0.012).toFixed(2)} (R${(cache.length * 0.012 * 5.7).toFixed(2)})
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{label}</p>
          <p className="text-lg font-black font-mono">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
