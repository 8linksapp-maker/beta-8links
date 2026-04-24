"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, ChevronRight, Menu, ChevronDown, Globe, Check, Plus, Zap, FileText, Target } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSite } from "@/lib/hooks/use-site";
import { useRouter } from "next/navigation";

interface TopBarProps {
  onMenuClick?: () => void;
  userName?: string;
  planName?: string;
}

interface UsageItem {
  used: number;
  limit: number;
  remaining: number;
  period?: string;
}

const pathLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/sites": "Meus Sites",
  "/keywords": "Keywords",
  "/backlinks": "Backlinks",
  "/keyword-planner": "Keyword Planner",
  "/articles": "Artigos IA",
  "/content-audit": "Auditoria",
  "/topical-map": "Mapa de Conteúdo",
  "/ai-visibility": "Visibilidade IA",
  "/competitors": "Concorrentes",
  "/site-health": "Saúde do Site",
  "/crm": "Revenda",
  "/reports": "Relatórios",
  "/courses": "Cursos",
  "/support": "Suporte",
  "/settings": "Configurações",
  "/onboarding": "Onboarding",
  "/debug": "Debug",
};

export function TopBar({ onMenuClick, userName = "Usuário", planName = "Starter" }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentLabel = pathLabels[pathname] || pathname.split("/").pop() || "";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const { sites, activeSite, setActiveSiteId } = useSite();
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const usageRef = useRef<HTMLDivElement>(null);

  // Usage data
  const [usage, setUsage] = useState<Record<string, UsageItem> | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then(r => r.json())
      .then(d => { if (d.usage) setUsage(d.usage); })
      .catch(() => {});
  }, [pathname]); // Refresh on navigation

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setSiteDropdownOpen(false);
      if (usageRef.current && !usageRef.current.contains(e.target as Node)) setUsageOpen(false);
    }
    if (siteDropdownOpen || usageOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [siteDropdownOpen, usageOpen]);

  const displayUrl = activeSite?.url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "Selecionar site";

  // Headline usage numbers
  const kwSearch = usage?.keyword_search;
  const kwPlan = usage?.keyword_plan;
  const articles = usage?.article;

  return (
    <header className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0 bg-background/80 backdrop-blur-sm relative z-[100]">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button onClick={onMenuClick} className="lg:hidden text-muted-foreground hover:text-foreground cursor-pointer">
          <Menu className="w-5 h-5" />
        </button>

        {/* Site selector */}
        {sites.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-primary/30 bg-card transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold max-w-[200px] truncate">{displayUrl}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${siteDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {siteDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-72 bg-card border border-border rounded-xl shadow-xl z-[100] overflow-hidden">
                <div className="p-2 border-b border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono px-2 py-1">Seus sites</p>
                </div>
                <div className="max-h-60 overflow-y-auto p-1.5">
                  {sites.map(site => (
                    <button
                      key={site.id}
                      onClick={() => { setActiveSiteId(site.id); setSiteDropdownOpen(false); }}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer ${activeSite?.id === site.id ? 'bg-primary-light' : 'hover:bg-muted/50'}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${activeSite?.id === site.id ? 'bg-primary border-primary' : 'border-border-strong'}`}>
                        {activeSite?.id === site.id && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{site.url?.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{site.niche_primary ?? "—"}</p>
                      </div>
                      {site.autopilot_active && <span className="w-2 h-2 rounded-full bg-success shrink-0" />}
                    </button>
                  ))}
                </div>
                <div className="p-1.5 border-t border-border">
                  <button
                    onClick={() => { router.push("/sites/new"); setSiteDropdownOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar site
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-semibold">{currentLabel}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Usage indicator */}
        {usage && (
          <div className="relative" ref={usageRef}>
            <button
              onClick={() => setUsageOpen(!usageOpen)}
              className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors cursor-pointer"
            >
              {/* Keyword searches (daily) */}
              {kwSearch && (
                <div className="flex items-center gap-1.5" title="Pesquisas de keywords hoje">
                  <Search className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-mono font-bold">
                    <span className={kwSearch.remaining <= 0 ? "text-destructive" : "text-foreground"}>{kwSearch.remaining}</span>
                    <span className="text-muted-foreground">/{kwSearch.limit}/dia</span>
                  </span>
                </div>
              )}

              {kwSearch && kwPlan && <div className="w-px h-3 bg-border" />}

              {/* Auto discovery (monthly) */}
              {kwPlan && (
                <div className="flex items-center gap-1.5" title="Descobertas automáticas este mês">
                  <Target className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-mono font-bold">
                    <span className={kwPlan.remaining <= 0 ? "text-destructive" : "text-foreground"}>{kwPlan.remaining}</span>
                    <span className="text-muted-foreground">/{kwPlan.limit >= 999 ? "∞" : kwPlan.limit}/mês</span>
                  </span>
                </div>
              )}

              <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${usageOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Usage dropdown */}
            {usageOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-xl z-[100] overflow-hidden">
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold">Uso este mês</p>
                    <span className="text-[10px] font-mono font-bold text-primary uppercase">{planName}</span>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  <UsageRow icon={<Search className="w-3.5 h-3.5" />} label="Pesquisas" item={usage.keyword_search} />
                  <UsageRow icon={<Target className="w-3.5 h-3.5" />} label="Descobertas auto" item={usage.keyword_plan} />
                  <UsageRow icon={<FileText className="w-3.5 h-3.5" />} label="Artigos IA" item={usage.article} />
                  <UsageRow icon={<Zap className="w-3.5 h-3.5" />} label="Diagnósticos" item={usage.diagnostic} />
                </div>
                <div className="p-2 border-t border-border">
                  <button
                    onClick={() => { router.push("/settings"); setUsageOpen(false); }}
                    className="w-full text-center text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer py-1"
                  >
                    Ver detalhes do plano
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <button className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-muted-foreground hover:border-border-strong transition-colors cursor-pointer">
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Buscar...</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono ml-2">⌘K</kbd>
        </button>

        {/* Notifications */}
        <button className="relative text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full ring-2 ring-background" />
        </button>

        {/* Avatar */}
        <Avatar size="sm">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

function UsageRow({ icon, label, item }: { icon: React.ReactNode; label: string; item?: UsageItem }) {
  if (!item) return null;
  const isUnlimited = item.limit >= 999;
  const pct = isUnlimited ? 5 : Math.min(100, (item.used / item.limit) * 100);
  const isExhausted = !isUnlimited && item.remaining <= 0;
  const periodLabel = item.period === "daily" ? "/dia" : "/mês";

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium">{label}</span>
          <span className="text-[10px] font-mono font-bold">
            {isUnlimited ? (
              <span className="text-muted-foreground">ilimitado</span>
            ) : (
              <>
                <span className={isExhausted ? "text-destructive" : "text-foreground"}>{item.used}</span>
                <span className="text-muted-foreground">/{item.limit}{periodLabel}</span>
              </>
            )}
          </span>
        </div>
        {!isUnlimited && (
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isExhausted ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
