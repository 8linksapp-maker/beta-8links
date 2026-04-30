"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Search, Loader2, Copy, Globe, Link as LinkIcon, BarChart3,
  GitBranch, Eye, Zap, Database, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function DebugPage() {
  const [url, setUrl] = useState("");
  const [siteId, setSiteId] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState("");
  const [result, setResult] = useState<any>(null);
  const [debugTab, setDebugTab] = useState("tree");

  // Article generation fields
  const [clientSite, setClientSite] = useState("");
  const [networkSite, setNetworkSite] = useState("");
  const [clientContext, setClientContext] = useState("");
  const [networkContext, setNetworkContext] = useState("");
  const [blAnchor, setBlAnchor] = useState("");
  const [planKeywords, setPlanKeywords] = useState("");

  // Load user sites for siteId picker
  const [sites, setSites] = useState<any[]>([]);
  const [sitesLoaded, setSitesLoaded] = useState(false);
  const loadSites = async () => {
    if (sitesLoaded) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("client_sites").select("id, url, github_repo, gsc_site_url, ga_property_id, github_token, google_refresh_token, wp_url").eq("user_id", user.id);
    setSites(data ?? []);
    setSitesLoaded(true);
    if (data?.[0] && !siteId) {
      setSiteId(data[0].id);
    }
  };

  // Generic API caller
  const callApi = async (name: string, fetcher: () => Promise<Response>) => {
    setLoading(true);
    setActiveTest(name);
    setResult(null);
    setRawJson("");
    try {
      const res = await fetcher();
      const data = await res.json();
      setResult(data);
      setRawJson(JSON.stringify(data, null, 2));
    } catch (err) {
      const msg = String(err);
      setResult({ error: msg });
      setRawJson(msg);
    }
    setLoading(false);
  };

  const copyJson = () => {
    navigator.clipboard.writeText(rawJson);
    toast("JSON copiado!");
  };

  // Helper: call DataForSEO function directly via proxy
  const callDfsFn = (fn: string, ...args: any[]) =>
    callApi(fn, () => fetch("/api/debug-dataforseo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fn, args }) }));

  const cleanDomain = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");

  // All API endpoints
  const apis = [
    {
      group: "DataForSEO — Raw (direto na API)",
      items: [
        {
          id: "getBacklinkSummary",
          label: "Backlink Summary",
          icon: LinkIcon,
          desc: "/backlinks/summary/live — Resumo: total backlinks, ref domains, rank",
          needsUrl: true,
          call: () => callDfsFn("getBacklinkSummary", cleanDomain(url)),
        },
        {
          id: "getBacklinks-one-per-domain",
          label: "Backlinks (1 por domínio)",
          icon: LinkIcon,
          desc: "/backlinks/backlinks/live mode=one_per_domain — O melhor backlink de cada domínio com url_from, url_to, anchor",
          needsUrl: true,
          call: () => callDfsFn("getBacklinks", cleanDomain(url), 100, "one_per_domain"),
        },
        {
          id: "getBacklinks-as-is",
          label: "Backlinks (todos, as_is)",
          icon: LinkIcon,
          desc: "/backlinks/backlinks/live mode=as_is — Todos os backlinks individuais (pode ter spam/repetidos)",
          needsUrl: true,
          call: () => callDfsFn("getBacklinks", cleanDomain(url), 100, "as_is"),
        },
        {
          id: "getReferringDomains",
          label: "Referring Domains",
          icon: LinkIcon,
          desc: "/backlinks/referring_domains/live — Domínios agrupados (sem url_from/url_to/anchor)",
          needsUrl: true,
          call: () => callDfsFn("getReferringDomains", cleanDomain(url), 100),
        },
        {
          id: "getRankedKeywords",
          label: "Ranked Keywords",
          icon: Search,
          desc: "/dataforseo_labs/google/ranked_keywords/live — Keywords que o domínio rankeia",
          needsUrl: true,
          call: () => callDfsFn("getRankedKeywords", cleanDomain(url)),
        },
        {
          id: "getKeywordSuggestions",
          label: "Keyword Suggestions",
          icon: Search,
          desc: "/dataforseo_labs/google/keyword_suggestions/live — Sugestões a partir de 1 keyword",
          needsUrl: true,
          call: () => callDfsFn("getKeywordSuggestions", url),
        },
        {
          id: "getCompetitorDomains",
          label: "Competitor Domains",
          icon: Globe,
          desc: "/dataforseo_labs/google/competitors_domain/live — Top 5 concorrentes",
          needsUrl: true,
          call: () => callDfsFn("getCompetitorDomains", cleanDomain(url)),
        },
        {
          id: "analyzeSERP",
          label: "SERP Live",
          icon: BarChart3,
          desc: "/serp/google/organic/live/advanced — Top resultados orgânicos pra keyword",
          needsUrl: true,
          call: () => callDfsFn("analyzeSERP", url),
        },
        {
          id: "checkAIOverview",
          label: "AI Overview",
          icon: Eye,
          desc: "/serp/google/ai_mode/live/advanced — Resultado do AI Overview",
          needsUrl: true,
          call: () => callDfsFn("checkAIOverview", url),
        },
        {
          id: "parsePageContent",
          label: "Page Content",
          icon: Globe,
          desc: "/on_page/content_parsing — Parseia conteúdo de uma URL",
          needsUrl: true,
          call: () => callDfsFn("parsePageContent", url.startsWith("http") ? url : `https://${url}`),
        },
      ],
    },
    {
      group: "APIs Processadas (8links)",
      items: [
        {
          id: "analysis",
          label: "Analisar Site (sem GSC)",
          icon: Globe,
          desc: "POST /api/analyze-site — Sem keywords GSC, GPT classifica só com DataForSEO",
          needsUrl: true,
          call: () => callApi("analysis", () => fetch("/api/analyze-site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) })),
        },
        {
          id: "analysis-gsc",
          label: "Analisar Site (com GSC)",
          icon: Globe,
          desc: "POST /api/analyze-site — Com keywords GSC pra GPT classificar nicho. Precisa siteId.",
          needsSiteId: true,
          needsUrl: true,
          call: async () => {
            setLoading(true); setActiveTest("analysis-gsc"); setResult(null); setRawJson("");
            try {
              // First fetch GSC keywords
              const gscRes = await fetch(`/api/integrations/gsc-data?siteId=${siteId}&period=90`);
              const gsc = await gscRes.json();
              const gscKws = (gsc.keywords ?? []).filter((k: any) => k.clicks > 0).slice(0, 10).map((k: any) => k.keyword);
              // Then analyze with GSC keywords
              const res = await fetch("/api/analyze-site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, hasGscKeywords: gscKws.length > 0, gscKeywords: gscKws }) });
              const data = await res.json();
              setResult({ ...data, _debug_gscKeywordsSent: gscKws });
              setRawJson(JSON.stringify({ ...data, _debug_gscKeywordsSent: gscKws }, null, 2));
            } catch (err) { setResult({ error: String(err) }); setRawJson(String(err)); }
            setLoading(false);
          },
        },
        {
          id: "backlinks-processed",
          label: "Backlinks Processados",
          icon: LinkIcon,
          desc: "GET /api/integrations/external-backlinks — Backlinks agregados por domínio",
          needsUrl: true,
          call: () => callApi("backlinks-processed", () => fetch(`/api/integrations/external-backlinks?domain=${encodeURIComponent(url)}`)),
        },
        {
          id: "keywords-api",
          label: "Keyword Research",
          icon: Search,
          desc: "POST /api/keyword-research",
          needsUrl: true,
          call: () => callApi("keywords-api", () => fetch("/api/keyword-research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword: url }) })),
        },
        {
          id: "serp-api",
          label: "SERP Analysis",
          icon: BarChart3,
          desc: "POST /api/serp-analysis",
          needsUrl: true,
          call: () => callApi("serp-api", () => fetch("/api/serp-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword: url }) })),
        },
      ],
    },
    {
      group: "Google (por site)",
      items: [
        {
          id: "gsc-data",
          label: "Search Console",
          icon: Search,
          desc: "GET /api/integrations/gsc-data — Keywords, cliques, impressões, posições",
          needsSiteId: true,
          call: () => callApi("gsc-data", () => fetch(`/api/integrations/gsc-data?siteId=${siteId}&period=90`)),
        },
        {
          id: "ga-data",
          label: "Google Analytics",
          icon: BarChart3,
          desc: "GET /api/integrations/ga-data — Sessões, users, pageviews",
          needsSiteId: true,
          call: () => callApi("ga-data", () => fetch(`/api/integrations/ga-data?siteId=${siteId}&period=30`)),
        },
        {
          id: "google-props",
          label: "Google Properties",
          icon: Globe,
          desc: "GET /api/integrations/google-properties — Lista GA4 + GSC",
          needsSiteId: true,
          call: () => callApi("google-props", () => fetch(`/api/integrations/google-properties?siteId=${siteId}`)),
        },
      ],
    },
    {
      group: "GitHub (por site)",
      items: [
        {
          id: "github-repos",
          label: "GitHub Repos",
          icon: GitBranch,
          desc: "GET /api/integrations/github-repos",
          needsSiteId: true,
          call: () => callApi("github-repos", () => fetch(`/api/integrations/github-repos?siteId=${siteId}`)),
        },
        {
          id: "github-content",
          label: "GitHub Content",
          icon: GitBranch,
          desc: "GET /api/integrations/github-content — Busca .md/.mdx no repo",
          needsSiteId: true,
          call: () => callApi("github-content", () => fetch(`/api/integrations/github-content?siteId=${siteId}`)),
        },
        {
          id: "github-tree",
          label: "GitHub Repo Tree",
          icon: GitBranch,
          desc: "Lista a estrutura de pastas do repo pra entender onde estão os artigos",
          needsSiteId: true,
          call: async () => {
            setLoading(true); setActiveTest("github-tree"); setResult(null); setRawJson("");
            try {
              const supabase = createClient();
              const { data: site } = await supabase.from("client_sites").select("github_token, github_repo").eq("id", siteId).single();
              if (!site?.github_token || !site?.github_repo) { setResult({ error: "GitHub not connected or no repo", github_token: !!site?.github_token, github_repo: site?.github_repo }); setRawJson(JSON.stringify({ error: "no token/repo" })); setLoading(false); return; }
              const headers = { Authorization: `Bearer ${site.github_token}`, Accept: "application/vnd.github+json" };
              // Get repo tree (recursive)
              const res = await fetch(`https://api.github.com/repos/${site.github_repo}/git/trees/main?recursive=1`, { headers });
              if (!res.ok) {
                // Try master branch
                const res2 = await fetch(`https://api.github.com/repos/${site.github_repo}/git/trees/master?recursive=1`, { headers });
                const data = await res2.json();
                const files = (data.tree ?? []).filter((f: any) => f.type === "blob").map((f: any) => f.path);
                const mdFiles = files.filter((f: string) => f.endsWith(".md") || f.endsWith(".mdx"));
                setResult({ repo: site.github_repo, branch: "master", totalFiles: files.length, mdFiles, allDirs: [...new Set(files.map((f: string) => f.split("/").slice(0, -1).join("/")).filter(Boolean))] });
                setRawJson(JSON.stringify({ mdFiles, allDirs: [...new Set(files.map((f: string) => f.split("/").slice(0, -1).join("/")).filter(Boolean))] }, null, 2));
              } else {
                const data = await res.json();
                const files = (data.tree ?? []).filter((f: any) => f.type === "blob").map((f: any) => f.path);
                const mdFiles = files.filter((f: string) => f.endsWith(".md") || f.endsWith(".mdx"));
                setResult({ repo: site.github_repo, branch: "main", totalFiles: files.length, mdFiles, allDirs: [...new Set(files.map((f: string) => f.split("/").slice(0, -1).join("/")).filter(Boolean))] });
                setRawJson(JSON.stringify({ mdFiles, allDirs: [...new Set(files.map((f: string) => f.split("/").slice(0, -1).join("/")).filter(Boolean))] }, null, 2));
              }
            } catch (err) { setResult({ error: String(err) }); }
            setLoading(false);
          },
        },
      ],
    },
    {
      group: "Sistema",
      items: [
        {
          id: "usage",
          label: "API Usage / Limites",
          icon: Zap,
          desc: "GET /api/usage — Rate limits e uso diário",
          call: () => callApi("usage", () => fetch("/api/usage")),
        },
        {
          id: "site-db",
          label: "Site no Banco",
          icon: Database,
          desc: "Lê client_sites direto do Supabase",
          needsSiteId: true,
          call: async () => {
            setLoading(true);
            setActiveTest("site-db");
            try {
              const supabase = createClient();
              const { data, error } = await supabase.from("client_sites").select("*").eq("id", siteId).single();
              const res = error ? { error: error.message } : data;
              setResult(res);
              setRawJson(JSON.stringify(res, null, 2));
            } catch (err) { setResult({ error: String(err) }); }
            setLoading(false);
          },
        },
        {
          id: "keywords-db",
          label: "Keywords no Banco",
          icon: Search,
          desc: "Lê keywords do site no Supabase",
          needsSiteId: true,
          call: async () => {
            setLoading(true);
            setActiveTest("keywords-db");
            try {
              const supabase = createClient();
              const { data, error, count } = await supabase.from("keywords").select("*", { count: "exact" }).eq("client_site_id", siteId).order("search_volume", { ascending: false }).limit(50);
              setResult({ keywords: data, total: count, error: error?.message });
              setRawJson(JSON.stringify({ keywords: data, total: count, error: error?.message }, null, 2));
            } catch (err) { setResult({ error: String(err) }); }
            setLoading(false);
          },
        },
      ],
    },
    {
      group: "Admin — Rede de Sites",
      items: [
        {
          id: "scrape-network",
          label: "Scrape Contexto (GPT)",
          icon: Globe,
          desc: "Scrapeia sites sem contexto e classifica com GPT",
          call: () => callApi("scrape-network", () => fetch("/api/admin/scrape-network", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })),
        },
        {
          id: "update-network-metrics",
          label: "Atualizar AP + Backlinks + Artigos",
          icon: Globe,
          desc: "DataForSEO: AP e backlinks de cada site. Sitemap: contagem de artigos. ~$0.07 para 67 sites",
          call: () => callApi("update-network-metrics", () => fetch("/api/admin/update-network-metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })),
        },
        {
          id: "raw-ranks",
          label: "Raw Ranks DataForSEO",
          icon: Globe,
          desc: "Rank RAW do DataForSEO (0-100 e 0-1000). ~$0.07",
          call: () => callApi("raw-ranks", () => fetch("/api/admin/raw-ranks", { method: "POST" })),
        },
        {
          id: "moz-ranks",
          label: "Moz DA (só consultar)",
          icon: Globe,
          desc: "Pega DA/PA/Spam do Moz via RapidAPI. Não salva no banco.",
          call: () => callApi("moz-ranks", () => fetch("/api/admin/moz-ranks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ save: false }) })),
        },
        {
          id: "moz-ranks-save",
          label: "Moz DA (consultar E SALVAR)",
          icon: Globe,
          desc: "Pega DA/PA/Spam do Moz E salva no banco como AP de cada site.",
          call: () => callApi("moz-ranks-save", () => fetch("/api/admin/moz-ranks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ save: true }) })),
        },
        {
          id: "auto-article",
          label: "🚀 Auto Artigo (escolhe keyword + gera)",
          icon: Globe,
          desc: "GPT escolhe a melhor keyword do planejamento pra encaixar o backlink e gera o artigo completo",
          call: () => callApi("auto-article", () => fetch("/api/admin/auto-article", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              planKeywords: planKeywords.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 3),
              backlink: clientSite ? { url: clientSite, anchor: blAnchor, clientDescription: clientContext } : undefined,
              networkContext,
              model: "gpt-4.1-nano",
            }),
          })),
        },
        {
          id: "article-nano",
          label: "Gerar Artigo (gpt-4.1-nano)",
          icon: Globe,
          desc: "Pipeline completo: SERP → scrape headings → outline → artigo. Usa o campo URL como keyword.",
          needsUrl: true,
          call: () => callApi("article-nano", () => fetch("/api/admin/test-article", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword: url, model: "gpt-4.1-nano", backlink: clientSite ? { url: clientSite, anchor: blAnchor, clientDescription: clientContext } : undefined, siteContext: networkContext || undefined }) })),
        },
        {
          id: "find-image",
          label: "Buscar Imagem (heading)",
          icon: Globe,
          desc: "Busca imagem no banco → Unsplash → Pexels → Vision descreve → salva. Campo URL = heading do artigo.",
          needsUrl: true,
          call: () => callApi("find-image", () => fetch("/api/admin/find-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ heading: url }) })),
        },
        {
          id: "article-41mini",
          label: "Gerar Artigo (gpt-4.1-mini)",
          icon: Globe,
          desc: "Pipeline completo com gpt-4.1-mini. Melhor qualidade.",
          needsUrl: true,
          call: () => callApi("article-41mini", () => fetch("/api/admin/test-article", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword: url, model: "gpt-4.1-mini", backlink: clientSite ? { url: clientSite, anchor: blAnchor, clientDescription: clientContext } : undefined, siteContext: networkContext || undefined }) })),
        },
        {
          id: "article-41full",
          label: "Gerar Artigo (gpt-4.1)",
          icon: Globe,
          desc: "Pipeline completo com gpt-4.1 (modelo grande). Maior qualidade, custo mais alto.",
          needsUrl: true,
          call: () => callApi("article-41full", () => fetch("/api/admin/test-article", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyword: url, model: "gpt-4.1", backlink: clientSite ? { url: clientSite, anchor: blAnchor, clientDescription: clientContext } : undefined, siteContext: networkContext || undefined }) })),
        },
        {
          id: "plan-content",
          label: "Planejar 1 Site (200 keywords)",
          icon: Globe,
          desc: "Gera 200 keywords para o site no campo URL. Não salva no banco.",
          needsUrl: true,
          call: () => callApi("plan-content", () => fetch("/api/admin/plan-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: url, targetKeywords: 200 }) })),
        },
        {
          id: "plan-status",
          label: "📊 Status do Planejamento",
          icon: Globe,
          desc: "Mostra todos os sites da rede e quantas keywords cada um tem no banco",
          call: async () => {
            setLoading(true); setActiveTest("plan-status"); setResult(null); setRawJson("");
            try {
              const supabase = createClient();
              const { data: sites } = await supabase.from("network_sites").select("id, domain, niche").eq("status", "active").order("domain");
              if (!sites) { setResult({ error: "No sites" }); setLoading(false); return; }
              const statuses = [];
              let totalKw = 0;
              let planned = 0;
              let pending = 0;
              for (const site of sites) {
                const { count } = await supabase.from("content_calendar").select("id", { count: "exact", head: true }).eq("network_site_id", site.id);
                const kwCount = count ?? 0;
                totalKw += kwCount;
                if (kwCount >= 100) planned++;
                else pending++;
                statuses.push({ domain: site.domain, niche: site.niche, keywords: kwCount, status: kwCount >= 100 ? "✅" : kwCount > 0 ? "⚠️" : "❌" });
              }
              setResult({ sites: statuses, summary: { total: sites.length, planned, pending, totalKeywords: totalKw } });
              setRawJson(JSON.stringify({ sites: statuses, summary: { total: sites.length, planned, pending, totalKeywords: totalKw } }, null, 2));
            } catch (err) { setResult({ error: String(err) }); }
            setLoading(false);
          },
        },
        {
          id: "plan-all-5",
          label: "▶️ Planejar Rede (5 sites por vez)",
          icon: Globe,
          desc: "Roda planejamento + salva no banco pra 5 sites sem keywords. Clique várias vezes.",
          call: () => callApi("plan-all-5", () => fetch("/api/admin/plan-all-sites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchSize: 5, targetPerSite: 200 }) })),
        },
        {
          id: "list-network",
          label: "Listar Sites da Rede",
          icon: Globe,
          desc: "Lista todos os network_sites com contexto",
          call: async () => {
            setLoading(true); setActiveTest("list-network"); setResult(null); setRawJson("");
            try {
              const supabase = createClient();
              const { data, count } = await supabase.from("network_sites").select("*", { count: "exact" }).order("domain");
              setResult({ sites: data, total: count });
              setRawJson(JSON.stringify({ sites: data, total: count }, null, 2));
            } catch (err) { setResult({ error: String(err) }); }
            setLoading(false);
          },
        },
      ],
    },
  ];

  // Collapsible JSON viewer component
  const JsonNode = ({ data, depth = 0 }: { data: any; depth?: number }) => {
    const [collapsed, setCollapsed] = useState(depth > 1);
    if (data === null) return <span className="text-muted-foreground/50">null</span>;
    if (typeof data === "boolean") return <span className="text-primary">{String(data)}</span>;
    if (typeof data === "number") return <span className="text-success">{data}</span>;
    if (typeof data === "string") {
      if (data.startsWith("http")) return <a href={data} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{data}</a>;
      return <span className="text-warning break-all">&quot;{data}&quot;</span>;
    }
    if (Array.isArray(data)) {
      if (data.length === 0) return <span className="text-muted-foreground">[]</span>;
      return (
        <div>
          <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground cursor-pointer inline-flex items-center gap-1">
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span className="text-[10px] font-mono">Array[{data.length}]</span>
          </button>
          {!collapsed && (
            <div className="ml-4 border-l border-border/30 pl-2">
              {data.map((item, i) => (
                <div key={i} className="py-0.5">
                  <span className="text-muted-foreground/50 text-[10px] mr-1">{i}:</span>
                  <JsonNode data={item} depth={depth + 1} />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (typeof data === "object") {
      const keys = Object.keys(data);
      if (keys.length === 0) return <span className="text-muted-foreground">{"{}"}</span>;
      return (
        <div>
          {depth > 0 && (
            <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground cursor-pointer inline-flex items-center gap-1">
              {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span className="text-[10px] font-mono">{"{"}...{keys.length} keys{"}"}</span>
            </button>
          )}
          {(!collapsed || depth === 0) && (
            <div className={depth > 0 ? "ml-4 border-l border-border/30 pl-2" : ""}>
              {keys.map(key => (
                <div key={key} className="py-0.5">
                  <span className="text-foreground/70 font-semibold text-[11px]">{key}: </span>
                  <JsonNode data={data[key]} depth={depth + 1} />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return <span>{String(data)}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Debug — API Tester</h1>
        <p className="page-description">Testa todas as APIs e vê exatamente o que cada uma retorna</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coluna 1: APIs gerais */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wider font-mono">Consultas e Planejamento</p>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Domínio / Keyword — usado pra APIs, planejamento de conteúdo e geração de artigo</Label>
              <Input placeholder="atelierh2o.com.br ou 'o que é drywall'" value={url} onChange={(e) => setUrl(e.target.value)} className="text-base" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Site ID — só pra APIs Google/GitHub</Label>
            <div className="flex gap-2">
              <Input placeholder="uuid do site" value={siteId} onChange={(e) => setSiteId(e.target.value)} className="font-mono text-xs" />
              <Button variant="outline" size="sm" className="shrink-0" onClick={loadSites}>
                {sitesLoaded ? "Atualizar" : "Meus sites"}
              </Button>
            </div>
          </div>
          {sites.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sites.map(s => (
                <button key={s.id} onClick={() => { setSiteId(s.id); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-all ${siteId === s.id ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}>
                  {s.url?.replace(/^https?:\/\//, "") ?? s.id.slice(0, 8)}
                  <span className="ml-2 text-[9px] opacity-60">
                    {[s.google_refresh_token && "G", s.github_token && "GH", s.wp_url && "WP"].filter(Boolean).join(" ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

        {/* Coluna 2: Geração de artigo */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wider font-mono">Geração de Artigo com Backlink</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Site do Cliente</Label>
                <Input placeholder="https://cliente.com.br" value={clientSite} onChange={(e) => setClientSite(e.target.value)} className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Site da Rede</Label>
                <Input placeholder="atelierh2o.com.br" value={networkSite} onChange={(e) => setNetworkSite(e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Contexto do Cliente</Label>
                <Input placeholder="Empresa de avaliação de imóveis..." value={clientContext} onChange={(e) => setClientContext(e.target.value)} className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Contexto da Rede</Label>
                <Input placeholder="Blog sobre arquitetura e decoração" value={networkContext} onChange={(e) => setNetworkContext(e.target.value)} className="text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Âncora do Backlink</Label>
              <Input placeholder="avaliação de imóveis" value={blAnchor} onChange={(e) => setBlAnchor(e.target.value)} className="text-xs" />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Planejamento de keywords do site da rede (cole as keywords, 1 por linha)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none resize-y"
                placeholder={"melhores praias do nordeste\ncomo tirar passaporte\nquanto custa intercâmbio\no que é turismo sustentável"}
                value={planKeywords}
                onChange={(e) => setPlanKeywords(e.target.value)}
              />
              <p className="text-[9px] text-muted-foreground/60">{planKeywords.split("\n").filter(l => l.trim()).length} keywords no planejamento</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API buttons grouped */}
      <div className="space-y-4">
        {apis.map(group => (
          <div key={group.group}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2">{group.group}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {group.items.map(api => {
                const a = api as any;
                const hasInput = url.trim() || clientSite.trim();
                const disabled = loading || (a.needsUrl && !hasInput) || (a.needsSiteId && !siteId);
                return (
                  <button key={api.id} onClick={api.call} disabled={disabled}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${activeTest === api.id ? 'bg-primary/10 border-primary/30' : 'bg-card border-border hover:border-primary/20 hover:bg-muted/30'}`}>
                    <api.icon className={`w-4 h-4 mt-0.5 shrink-0 ${activeTest === api.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-xs font-semibold">{api.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{api.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-3 p-6 rounded-xl border bg-card">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-sm font-mono">{activeTest}...</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <Tabs value={debugTab} onValueChange={setDebugTab}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Badge variant={result.error ? "destructive" : "default"} className="text-[10px]">{activeTest}</Badge>
              {!result.error && <Badge variant="outline" className="text-[10px] font-mono">
                {result.backlinks?.length ?? result.keywords?.length ?? result.total ?? Object.keys(result).length} items
              </Badge>}
            </div>
            <div className="flex items-center gap-2">
              <TabsList className="h-7">
                <TabsTrigger value="tree" className="text-[10px] h-5 px-2">Tree</TabsTrigger>
                <TabsTrigger value="raw" className="text-[10px] h-5 px-2">Raw JSON</TabsTrigger>
                <TabsTrigger value="table" className="text-[10px] h-5 px-2">Tabela</TabsTrigger>
                {result?.article && <TabsTrigger value="preview" className="text-[10px] h-5 px-2">Preview</TabsTrigger>}
              </TabsList>
              <Button variant="ghost" size="sm" className="h-7" onClick={copyJson}><Copy className="w-3 h-3" /></Button>
              {result?.keywords && (
                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => {
                  const kws = result.keywords;
                  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Planejamento - ${result.domain || 'site'}</title><style>body{font-family:system-ui;max-width:1000px;margin:40px auto;padding:0 20px;background:#0a0a0a;color:#e0e0e0}h1{color:#f97316;border-bottom:2px solid #f97316;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#1a1a1a;color:#f97316;text-align:left;padding:10px;font-size:11px;text-transform:uppercase;letter-spacing:1px}td{padding:8px 10px;border-bottom:1px solid #1a1a1a;font-size:13px}.vol{font-weight:bold;color:#f97316;text-align:right}.dif{text-align:center}.ratio{text-align:right;color:#888}.stats{background:#111;padding:16px;border-radius:8px;margin:16px 0;display:flex;gap:24px;flex-wrap:wrap;font-size:13px;color:#888}.stats b{color:#f97316}</style></head><body><h1>Planejamento de Conteúdo — ${result.domain || ''}</h1><div class="stats"><span>Nicho: <b>${result.niche || ''}</b></span><span>Keywords: <b>${kws.length}</b></span><span>Volume total: <b>${result.stats?.totalVolume?.toLocaleString() || 0}/mês</b></span><span>Dificuldade média: <b>${result.stats?.avgDifficulty || 0}</b></span><span>Gerado em: <b>${new Date().toLocaleDateString('pt-BR')}</b></span></div><table><thead><tr><th>#</th><th>Keyword</th><th style="text-align:right">Volume/mês</th><th style="text-align:center">Dificuldade</th><th style="text-align:right">Ratio</th></tr></thead><tbody>${kws.map((k: any, i: number) => `<tr><td>${i+1}</td><td>${k.keyword}</td><td class="vol">${k.volume?.toLocaleString()}</td><td class="dif">${k.difficulty}</td><td class="ratio">${Math.round(k.volume / (k.difficulty + 1))}</td></tr>`).join('')}</tbody></table></body></html>`;
                  const blob = new Blob([html], { type: 'text/html' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `planejamento_${(result.domain || 'site').replace(/\./g, '_')}.html`;
                  a.click();
                }}>Baixar HTML</Button>
              )}
            </div>
          </div>

          {/* Tree view */}
          <TabsContent value="tree">
            <Card>
              <CardContent className="p-4 max-h-[600px] overflow-y-auto">
                <div className="text-[11px] font-mono leading-relaxed">
                  <JsonNode data={result} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Raw JSON */}
          <TabsContent value="raw">
            <Card>
              <CardContent className="p-0">
                <pre className="text-[11px] font-mono whitespace-pre-wrap bg-[hsl(20,12%,5%)] p-4 rounded-xl max-h-[600px] overflow-y-auto text-muted-foreground leading-relaxed">
                  {rawJson || "Nenhum resultado"}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Table view — for arrays */}
          <TabsContent value="table">
            <Card>
              <CardContent className="p-0">
                {(() => {
                  // Find the main array in the result
                  const arr = result.backlinks ?? result.keywords ?? result.repos ?? result.articles ?? result.daily ?? (Array.isArray(result) ? result : null);
                  if (!arr || !Array.isArray(arr) || arr.length === 0) {
                    return <p className="text-xs text-muted-foreground p-4">Sem dados tabulares. Use a view Tree ou Raw.</p>;
                  }
                  const cols = Object.keys(arr[0]).filter(k => !Array.isArray(arr[0][k]) || k === "allAnchors");
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="px-2 py-2 text-left font-mono text-[9px] text-muted-foreground uppercase">#</th>
                            {cols.map(c => (
                              <th key={c} className="px-2 py-2 text-left font-mono text-[9px] text-muted-foreground uppercase whitespace-nowrap">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {arr.slice(0, 100).map((row: any, i: number) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="px-2 py-1.5 text-muted-foreground/50">{i}</td>
                              {cols.map(c => (
                                <td key={c} className="px-2 py-1.5 max-w-[250px] truncate font-mono">
                                  {typeof row[c] === "boolean" ? (
                                    <Badge variant={row[c] ? "default" : "outline"} className="text-[9px]">{String(row[c])}</Badge>
                                  ) : Array.isArray(row[c]) ? (
                                    <span className="text-muted-foreground">[{row[c].length}]</span>
                                  ) : typeof row[c] === "string" && row[c].startsWith("http") ? (
                                    <a href={row[c]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block max-w-[250px]">{row[c]}</a>
                                  ) : (
                                    String(row[c] ?? "")
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {arr.length > 100 && <p className="text-[10px] text-muted-foreground p-2 text-center">Mostrando 100 de {arr.length}</p>}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Article preview */}
          {result?.article && (
            <TabsContent value="preview">
              <Card>
                <CardContent className="p-0">
                  {/* Stats bar */}
                  <div className="flex flex-wrap gap-4 p-4 border-b border-border bg-muted/20 text-xs text-muted-foreground">
                    <span>Modelo: <span className="text-primary font-bold">{result.model}</span></span>
                    <span>Palavras: <span className="text-primary font-bold">{result.stats?.wordCount}</span></span>
                    <span>Alvo: <span className="text-primary font-bold">{result.steps?.find((s: any) => s.step.includes("Word count") || s.step.includes("Size"))?.data?.target ?? "?"}</span></span>
                    <span>Custo: <span className="text-primary font-bold">{result.stats?.cost} (R$ {(parseFloat(result.stats?.cost?.replace("$","") || "0") * 5.7).toFixed(2)})</span></span>
                    <span>Tempo: <span className="text-primary font-bold">{result.stats?.totalDuration}</span></span>
                    <span>Imagens: <span className="text-primary font-bold">{result.steps?.find((s: any) => s.step.includes("image"))?.data?.found ?? 0}</span></span>
                    {result.backlink && <span>Backlink: <span className={result.backlink.inserted ? "text-success font-bold" : "text-destructive font-bold"}>{result.backlink.inserted ? "✓ inserido" : "✗ NÃO inserido"}</span> — <span className="text-foreground">{result.backlink.anchor}</span> → <span className="font-mono">{result.backlink.url}</span></span>}
                  </div>
                  {/* Article rendered */}
                  <div className="p-6 prose prose-invert prose-sm max-w-none
                    prose-headings:font-[family-name:var(--font-display)]
                    prose-h1:text-2xl prose-h1:border-b prose-h1:border-primary prose-h1:pb-3 prose-h1:text-white
                    prose-h2:text-xl prose-h2:text-primary prose-h2:mt-8
                    prose-h3:text-base prose-h3:text-foreground/80
                    prose-p:text-muted-foreground prose-p:leading-relaxed
                    prose-strong:text-foreground
                    prose-li:text-muted-foreground
                    prose-img:rounded-xl prose-img:my-4
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  " dangerouslySetInnerHTML={{ __html: (() => {
                    const lines = result.article.split('\n');
                    let html = '';
                    let inList = false;

                    for (const line of lines) {
                      const trimmed = line.trim();

                      // Images with caption
                      if (trimmed.startsWith('![')) {
                        const imgMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                        if (imgMatch) {
                          html += `<img src="${imgMatch[2]}" alt="${imgMatch[1]}" style="width:100%;border-radius:12px;margin:24px 0 8px">`;
                          continue;
                        }
                      }
                      // Image caption
                      if (trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**')) {
                        html += `<p style="font-size:11px;color:#666;text-align:center;margin-top:0">${trimmed.slice(1, -1)}</p>`;
                        continue;
                      }
                      // Headings
                      if (trimmed.startsWith('### ')) {
                        if (inList) { html += '</ul>'; inList = false; }
                        html += `<h3 style="font-size:1.1em;color:#ccc;margin-top:1.5em;margin-bottom:0.5em;font-weight:700">${trimmed.slice(4)}</h3>`;
                        continue;
                      }
                      if (trimmed.startsWith('## ')) {
                        if (inList) { html += '</ul>'; inList = false; }
                        // Remove word count hints like (~200 palavras)
                        const h2Text = trimmed.slice(3).replace(/\s*\(~?\d+\s*palavras?\)/gi, '');
                        html += `<h2 style="font-size:1.4em;color:#f97316;margin-top:2em;margin-bottom:0.5em;font-weight:800;border-bottom:1px solid #222;padding-bottom:8px">${h2Text}</h2>`;
                        continue;
                      }
                      if (trimmed.startsWith('# ')) {
                        if (inList) { html += '</ul>'; inList = false; }
                        html += `<h1 style="font-size:1.8em;color:#fff;margin-bottom:1em;font-weight:900;border-bottom:2px solid #f97316;padding-bottom:12px">${trimmed.slice(2)}</h1>`;
                        continue;
                      }
                      // List items
                      if (trimmed.startsWith('- ')) {
                        if (!inList) { html += '<ul style="margin:1em 0;padding-left:20px">'; inList = true; }
                        let liContent = trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff">$1</strong>');
                        html += `<li style="margin:0.4em 0;color:#a0a0a0">${liContent}</li>`;
                        continue;
                      }
                      // Empty line
                      if (trimmed === '') {
                        if (inList) { html += '</ul>'; inList = false; }
                        continue;
                      }
                      // Regular paragraph
                      if (inList) { html += '</ul>'; inList = false; }
                      let pContent = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff">$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#f97316">$1</a>');
                      html += `<p style="margin:0.8em 0;color:#b0b0b0;line-height:1.8">${pContent}</p>`;
                    }
                    if (inList) html += '</ul>';
                    return html;
                  })() }} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
