"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import {
  Loader2,
  Copy,
  Check,
  Database,
  Globe,
  GitBranch,
  Search,
  Brain,
  Link as LinkIcon,
  Network,
  Users,
  CreditCard,
  Bug,
  Activity,
  Play,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { JsonTree } from "@/components/diagnostics/json-tree";
import { createClient } from "@/lib/supabase/client";
import {
  FEATURES,
  coverageStats,
  PERSONA_LABEL,
  STATUS_LABEL,
  CRITICITY_LABEL,
  type Persona,
  type Criticity,
  type FeatureStatus,
} from "@e2e/coverage";

// ─────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────

type Need = "domain" | "siteId" | "userEmail" | "anchorPlan";

interface ProbeContext {
  domain: string;
  siteId: string;
  userEmail: string;
  // Campos extras pra geração de artigo
  clientSite: string;
  clientContext: string;
  networkContext: string;
  blAnchor: string;
  planKeywords: string;
}

interface Probe {
  id: string;
  label: string;
  desc: string;
  /** Caminho mostrado no card (visual). */
  endpoint?: string;
  /** Nota de custo aproximado. */
  cost?: string;
  /** Inputs obrigatórios pra esse probe. */
  needs?: Need[];
  /** Função que executa. Recebe ctx e retorna o JSON da resposta. */
  run: (ctx: ProbeContext) => Promise<any>;
}

interface Category {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Inputs adicionais que essa categoria revela no painel superior */
  extraInputs?: Array<"articleGen">;
  probes: Probe[];
}

interface ProbeResult {
  probeId: string;
  data: any;
  durationMs: number;
  status: "ok" | "error";
  startedAt: number;
}

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────

const cleanDomain = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/+$/, "");

const callJson = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ...data, _httpStatus: res.status };
  return data;
};

const callDfs = (fn: string, ...args: any[]) =>
  callJson("/api/admin/dataforseo-probe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fn, args }),
  });

const supabaseClient = () => createClient();

// ─────────────────────────────────────────────────────────────────────
// CATEGORIAS + PROBES
// ─────────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  // ─────── 🔌 SEO Data (DataForSEO) ───────
  {
    id: "seo-data",
    label: "SEO Data",
    icon: LinkIcon,
    probes: [
      {
        id: "backlink-summary",
        label: "Backlink Summary",
        desc: "Resumo: total de backlinks, ref domains, rank do domínio",
        endpoint: "DataForSEO /backlinks/summary/live",
        cost: "~$0.04",
        needs: ["domain"],
        run: ({ domain }) => callDfs("getBacklinkSummary", cleanDomain(domain)),
      },
      {
        id: "backlinks-one-per-domain",
        label: "Backlinks (1 por domínio)",
        desc: "O melhor backlink de cada domínio com url_from / url_to / anchor",
        endpoint: "/backlinks/backlinks/live mode=one_per_domain",
        cost: "~$0.04",
        needs: ["domain"],
        run: ({ domain }) => callDfs("getBacklinks", cleanDomain(domain), 100, "one_per_domain"),
      },
      {
        id: "backlinks-as-is",
        label: "Backlinks (todos, as_is)",
        desc: "Todos os backlinks individuais (pode ter spam/repetidos)",
        endpoint: "/backlinks/backlinks/live mode=as_is",
        cost: "~$0.04",
        needs: ["domain"],
        run: ({ domain }) => callDfs("getBacklinks", cleanDomain(domain), 100, "as_is"),
      },
      {
        id: "referring-domains",
        label: "Referring Domains",
        desc: "Domínios agrupados (sem url_from / url_to / anchor)",
        endpoint: "/backlinks/referring_domains/live",
        cost: "~$0.04",
        needs: ["domain"],
        run: ({ domain }) => callDfs("getReferringDomains", cleanDomain(domain), 100),
      },
      {
        id: "ranked-keywords",
        label: "Ranked Keywords",
        desc: "Keywords que o domínio rankeia",
        endpoint: "/dataforseo_labs/google/ranked_keywords/live",
        cost: "~$0.05",
        needs: ["domain"],
        run: ({ domain }) => callDfs("getRankedKeywords", cleanDomain(domain)),
      },
      {
        id: "keyword-suggestions",
        label: "Keyword Suggestions",
        desc: "Sugestões a partir de 1 keyword (use o campo Domínio como keyword)",
        endpoint: "/dataforseo_labs/google/keyword_suggestions/live",
        cost: "~$0.05",
        needs: ["domain"],
        run: ({ domain }) => callDfs("getKeywordSuggestions", domain),
      },
      {
        id: "competitor-domains",
        label: "Competitor Domains",
        desc: "Top 5 concorrentes do domínio",
        endpoint: "/dataforseo_labs/google/competitors_domain/live",
        cost: "~$0.04",
        needs: ["domain"],
        run: ({ domain }) => callDfs("getCompetitorDomains", cleanDomain(domain)),
      },
      {
        id: "serp-live",
        label: "SERP Live (organic)",
        desc: "Top resultados orgânicos do Google pra keyword (use o campo Domínio como keyword)",
        endpoint: "/serp/google/organic/live/advanced",
        cost: "~$0.005",
        needs: ["domain"],
        run: ({ domain }) => callDfs("analyzeSERP", domain),
      },
      {
        id: "ai-overview",
        label: "AI Overview",
        desc: "Resultado do AI Overview (Google) pra keyword",
        endpoint: "/serp/google/ai_mode/live/advanced",
        cost: "~$0.005",
        needs: ["domain"],
        run: ({ domain }) => callDfs("checkAIOverview", domain),
      },
      {
        id: "page-content",
        label: "Page Content Parsing",
        desc: "Parseia conteúdo HTML de uma URL",
        endpoint: "/on_page/content_parsing",
        cost: "~$0.001",
        needs: ["domain"],
        run: ({ domain }) => callDfs("parsePageContent", domain.startsWith("http") ? domain : `https://${domain}`),
      },
    ],
  },

  // ─────── 📊 Google (GSC + GA) ───────
  {
    id: "google",
    label: "Google",
    icon: Search,
    probes: [
      {
        id: "gsc-data",
        label: "Search Console — keywords",
        desc: "Keywords, cliques, impressões e posições dos últimos 90 dias",
        endpoint: "GET /api/integrations/gsc-data",
        needs: ["siteId"],
        run: ({ siteId }) => callJson(`/api/integrations/gsc-data?siteId=${siteId}&period=90`),
      },
      {
        id: "gsc-pages",
        label: "Search Console — pages",
        desc: "Top páginas com tráfego orgânico nos últimos 90 dias",
        endpoint: "GET /api/integrations/gsc-pages",
        needs: ["siteId"],
        run: ({ siteId }) => callJson(`/api/integrations/gsc-pages?siteId=${siteId}&period=90`),
      },
      {
        id: "gsc-changes",
        label: "Search Console — keyword changes",
        desc: "Keywords que subiram ou caíram de posição",
        endpoint: "GET /api/integrations/gsc-keyword-changes",
        needs: ["siteId"],
        run: ({ siteId }) => callJson(`/api/integrations/gsc-keyword-changes?siteId=${siteId}`),
      },
      {
        id: "gsc-keywords-full",
        label: "Search Console — keywords (full)",
        desc: "Lista completa de keywords (sem agregação)",
        endpoint: "GET /api/integrations/gsc-keywords-full",
        needs: ["siteId"],
        run: ({ siteId }) => callJson(`/api/integrations/gsc-keywords-full?siteId=${siteId}`),
      },
      {
        id: "ga-data",
        label: "Google Analytics 4",
        desc: "Sessões, users, pageviews dos últimos 30 dias",
        endpoint: "GET /api/integrations/ga-data",
        needs: ["siteId"],
        run: ({ siteId }) => callJson(`/api/integrations/ga-data?siteId=${siteId}&period=30`),
      },
      {
        id: "google-properties",
        label: "Google Properties",
        desc: "Lista properties GA4 e GSC disponíveis pra conta conectada",
        endpoint: "GET /api/integrations/google-properties",
        needs: ["siteId"],
        run: ({ siteId }) => callJson(`/api/integrations/google-properties?siteId=${siteId}`),
      },
    ],
  },

  // ─────── 🐙 GitHub ───────
  {
    id: "github",
    label: "GitHub",
    icon: GitBranch,
    probes: [
      {
        id: "github-repos",
        label: "Listar repositórios",
        desc: "Repos disponíveis na conta GitHub conectada",
        endpoint: "GET /api/integrations/github-repos",
        needs: ["siteId"],
        run: ({ siteId }) => callJson(`/api/integrations/github-repos?siteId=${siteId}`),
      },
      {
        id: "github-content",
        label: "Conteúdo do repo",
        desc: "Busca arquivos .md / .mdx no repo configurado",
        endpoint: "GET /api/integrations/github-content",
        needs: ["siteId"],
        run: ({ siteId }) => callJson(`/api/integrations/github-content?siteId=${siteId}`),
      },
      {
        id: "github-tree",
        label: "Estrutura do repo (tree)",
        desc: "Lista todas as pastas + arquivos pra entender onde os artigos moram",
        needs: ["siteId"],
        run: async ({ siteId }) => {
          const supabase = supabaseClient();
          const { data: site } = await supabase
            .from("client_sites")
            .select("github_token, github_repo")
            .eq("id", siteId)
            .single();
          if (!site?.github_token || !site?.github_repo) {
            return { error: "GitHub não conectado para esse site", github_token: !!site?.github_token, github_repo: site?.github_repo };
          }
          const headers = { Authorization: `Bearer ${site.github_token}`, Accept: "application/vnd.github+json" };
          for (const branch of ["main", "master"]) {
            const res = await fetch(`https://api.github.com/repos/${site.github_repo}/git/trees/${branch}?recursive=1`, { headers });
            if (res.ok) {
              const data = await res.json();
              const files = (data.tree ?? []).filter((f: any) => f.type === "blob").map((f: any) => f.path);
              const mdFiles = files.filter((f: string) => f.endsWith(".md") || f.endsWith(".mdx"));
              const allDirs = [...new Set(files.map((f: string) => f.split("/").slice(0, -1).join("/")).filter(Boolean))];
              return { repo: site.github_repo, branch, totalFiles: files.length, mdFiles, allDirs };
            }
          }
          return { error: "Não foi possível ler árvore (main ou master)" };
        },
      },
    ],
  },

  // ─────── 🧠 Análise & IA ───────
  {
    id: "analysis-ai",
    label: "Análise & IA",
    icon: Brain,
    probes: [
      {
        id: "analyze-site",
        label: "Analisar site (sem GSC)",
        desc: "GPT classifica nicho usando só DataForSEO",
        endpoint: "POST /api/analyze-site",
        needs: ["domain"],
        run: ({ domain }) =>
          callJson("/api/analyze-site", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: domain }),
          }),
      },
      {
        id: "analyze-site-gsc",
        label: "Analisar site (com GSC)",
        desc: "Busca top keywords GSC e usa elas pro GPT classificar nicho com mais precisão",
        endpoint: "POST /api/analyze-site (+ GSC keywords)",
        needs: ["domain", "siteId"],
        run: async ({ domain, siteId }) => {
          const gsc = await callJson(`/api/integrations/gsc-data?siteId=${siteId}&period=90`);
          const gscKws = (gsc.keywords ?? [])
            .filter((k: any) => k.clicks > 0)
            .slice(0, 10)
            .map((k: any) => k.keyword);
          const data = await callJson("/api/analyze-site", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: domain, hasGscKeywords: gscKws.length > 0, gscKeywords: gscKws }),
          });
          return { ...data, _debug_gscKeywordsSent: gscKws };
        },
      },
      {
        id: "detect-niche",
        label: "Detectar nicho",
        desc: "Detecção automática de nicho do site",
        endpoint: "POST /api/sites/[id]/detect-niche",
        needs: ["siteId"],
        run: ({ siteId }) =>
          callJson(`/api/sites/${siteId}/detect-niche`, { method: "POST" }),
      },
      {
        id: "scrape-site",
        label: "Scrape site (test)",
        desc: "Extrai conteúdo HTML pra alimentar pipeline de análise",
        endpoint: "POST /api/integrations/scrape-site",
        needs: ["domain"],
        run: ({ domain }) =>
          callJson("/api/integrations/scrape-site", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: domain.startsWith("http") ? domain : `https://${domain}` }),
          }),
      },
      {
        id: "keyword-research",
        label: "Keyword Research",
        desc: "API processada de pesquisa de palavra-chave",
        endpoint: "POST /api/keyword-research",
        needs: ["domain"],
        run: ({ domain }) =>
          callJson("/api/keyword-research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword: domain }),
          }),
      },
      {
        id: "serp-analysis",
        label: "SERP Analysis (processada)",
        desc: "Análise SERP que alimenta o gerador de artigo",
        endpoint: "POST /api/serp-analysis",
        needs: ["domain"],
        run: ({ domain }) =>
          callJson("/api/serp-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword: domain }),
          }),
      },
      {
        id: "external-backlinks",
        label: "External Backlinks (agregada)",
        desc: "Backlinks agregados por domínio (forma usada pelo dashboard)",
        endpoint: "GET /api/integrations/external-backlinks",
        needs: ["domain"],
        run: ({ domain }) => callJson(`/api/integrations/external-backlinks?domain=${encodeURIComponent(domain)}`),
      },
      {
        id: "ai-visibility",
        label: "Visibilidade em IA",
        desc: "Verifica menção do site em ChatGPT / Perplexity",
        endpoint: "POST /api/ai-visibility",
        needs: ["domain"],
        run: ({ domain }) =>
          callJson("/api/ai-visibility", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domain: cleanDomain(domain) }),
          }),
      },
      {
        id: "find-image",
        label: "Buscar imagem (Unsplash + Pexels)",
        desc: "Busca imagem no banco → Unsplash → Pexels → Vision descreve. Use o campo Domínio como heading do artigo.",
        endpoint: "POST /api/admin/find-image",
        cost: "~$0.001",
        needs: ["domain"],
        run: ({ domain }) =>
          callJson("/api/admin/find-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ heading: domain }),
          }),
      },
    ],
  },

  // ─────── 🔗 Backlinks Pipeline ───────
  {
    id: "pipeline",
    label: "Backlinks Pipeline",
    icon: LinkIcon,
    extraInputs: ["articleGen"],
    probes: [
      {
        id: "auto-article",
        label: "🚀 Auto Artigo (escolhe keyword + gera)",
        desc: "GPT escolhe a melhor keyword do planejamento pra encaixar o backlink, e gera o artigo completo",
        endpoint: "POST /api/admin/auto-article",
        cost: "~$0.10",
        run: ({ clientSite, blAnchor, clientContext, networkContext, planKeywords }) =>
          callJson("/api/admin/auto-article", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              planKeywords: planKeywords.split("\n").map(l => l.trim()).filter(l => l.length > 3),
              backlink: clientSite ? { url: clientSite, anchor: blAnchor, clientDescription: clientContext } : undefined,
              networkContext,
              model: "gpt-4.1-nano",
            }),
          }),
      },
      {
        id: "test-article-nano",
        label: "Gerar artigo — gpt-4.1-nano",
        desc: "Pipeline completo: SERP → scrape → outline → artigo. Usa Domínio como keyword.",
        endpoint: "POST /api/admin/test-article",
        cost: "~$0.04",
        needs: ["domain"],
        run: ({ domain, clientSite, blAnchor, clientContext, networkContext }) =>
          callJson("/api/admin/test-article", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keyword: domain,
              model: "gpt-4.1-nano",
              backlink: clientSite ? { url: clientSite, anchor: blAnchor, clientDescription: clientContext } : undefined,
              siteContext: networkContext || undefined,
            }),
          }),
      },
      {
        id: "test-article-mini",
        label: "Gerar artigo — gpt-4.1-mini",
        desc: "Mesma pipeline, modelo melhor (mais caro)",
        endpoint: "POST /api/admin/test-article",
        cost: "~$0.20",
        needs: ["domain"],
        run: ({ domain, clientSite, blAnchor, clientContext, networkContext }) =>
          callJson("/api/admin/test-article", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keyword: domain,
              model: "gpt-4.1-mini",
              backlink: clientSite ? { url: clientSite, anchor: blAnchor, clientDescription: clientContext } : undefined,
              siteContext: networkContext || undefined,
            }),
          }),
      },
      {
        id: "test-article-full",
        label: "Gerar artigo — gpt-4.1",
        desc: "Modelo grande, melhor qualidade, custo bem mais alto",
        endpoint: "POST /api/admin/test-article",
        cost: "~$1.00+",
        needs: ["domain"],
        run: ({ domain, clientSite, blAnchor, clientContext, networkContext }) =>
          callJson("/api/admin/test-article", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keyword: domain,
              model: "gpt-4.1",
              backlink: clientSite ? { url: clientSite, anchor: blAnchor, clientDescription: clientContext } : undefined,
              siteContext: networkContext || undefined,
            }),
          }),
      },
      {
        id: "process-backlink",
        label: "Process Backlink (genérico)",
        desc: "Endpoint usado pela fila pra processar um backlink pendente",
        endpoint: "POST /api/admin/process-backlink",
        run: () =>
          callJson("/api/admin/process-backlink", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }),
      },
      {
        id: "publish-post",
        label: "Publish Post",
        desc: "Publica artigo gerado em network site (sem siteId/title aqui, só pra ver o erro de validação)",
        endpoint: "POST /api/admin/publish-post",
        run: () =>
          callJson("/api/admin/publish-post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }),
      },
      {
        id: "delete-post",
        label: "Delete Post",
        desc: "Remove um post da rede (sem args = erro de validação, só pra ver shape)",
        endpoint: "POST /api/admin/delete-post",
        run: () =>
          callJson("/api/admin/delete-post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }),
      },
    ],
  },

  // ─────── 🌐 Rede de Sites ───────
  {
    id: "network",
    label: "Rede de Sites",
    icon: Network,
    probes: [
      {
        id: "list-network",
        label: "Listar sites da rede",
        desc: "Todos os network_sites com contexto e métricas",
        endpoint: "Supabase: network_sites",
        run: async () => {
          const supabase = supabaseClient();
          const { data, count } = await supabase.from("network_sites").select("*", { count: "exact" }).order("domain");
          return { sites: data, total: count };
        },
      },
      {
        id: "scrape-network",
        label: "Scrape contexto (GPT)",
        desc: "Scrapeia sites sem contexto e classifica com GPT",
        endpoint: "POST /api/admin/scrape-network",
        cost: "~$0.05/site",
        run: () =>
          callJson("/api/admin/scrape-network", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }),
      },
      {
        id: "update-network-metrics",
        label: "Atualizar AP + backlinks + artigos",
        desc: "DataForSEO: AP e backlinks de cada site da rede. Sitemap: contagem de artigos.",
        endpoint: "POST /api/admin/update-network-metrics",
        cost: "~$0.07 / 67 sites",
        run: () =>
          callJson("/api/admin/update-network-metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }),
      },
      {
        id: "raw-ranks",
        label: "Raw Ranks DataForSEO",
        desc: "Rank RAW (0-100 e 0-1000) de cada site da rede",
        endpoint: "POST /api/admin/raw-ranks",
        cost: "~$0.07",
        run: () => callJson("/api/admin/raw-ranks", { method: "POST" }),
      },
      {
        id: "moz-ranks-read",
        label: "Moz DA — só consultar",
        desc: "DA / PA / Spam do Moz via RapidAPI. Não salva.",
        endpoint: "POST /api/admin/moz-ranks (save=false)",
        run: () =>
          callJson("/api/admin/moz-ranks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ save: false }),
          }),
      },
      {
        id: "moz-ranks-save",
        label: "Moz DA — consultar e SALVAR",
        desc: "DA / PA / Spam do Moz E salva no banco como AP de cada site.",
        endpoint: "POST /api/admin/moz-ranks (save=true)",
        run: () =>
          callJson("/api/admin/moz-ranks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ save: true }),
          }),
      },
      {
        id: "plan-content",
        label: "Planejar 1 site (200 keywords)",
        desc: "Gera 200 keywords pro site informado no campo Domínio. Não salva.",
        endpoint: "POST /api/admin/plan-content",
        cost: "~$0.20",
        needs: ["domain"],
        run: ({ domain }) =>
          callJson("/api/admin/plan-content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domain, targetKeywords: 200 }),
          }),
      },
      {
        id: "plan-all",
        label: "Planejar rede em lote (5 por vez)",
        desc: "Roda planejamento + salva no banco pra 5 sites sem keywords. Clique várias vezes.",
        endpoint: "POST /api/admin/plan-all-sites",
        cost: "~$1.00 por execução",
        run: () =>
          callJson("/api/admin/plan-all-sites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ batchSize: 5, targetPerSite: 200 }),
          }),
      },
      {
        id: "plan-status",
        label: "📊 Status do planejamento",
        desc: "Mostra todos os sites da rede e quantas keywords cada um tem no banco",
        endpoint: "Supabase: content_calendar (count por site)",
        run: async () => {
          const supabase = supabaseClient();
          const { data: sites } = await supabase
            .from("network_sites")
            .select("id, domain, niche")
            .eq("status", "active")
            .order("domain");
          if (!sites) return { error: "No sites" };
          const statuses: any[] = [];
          let totalKw = 0;
          let planned = 0;
          let pending = 0;
          for (const site of sites) {
            const { count } = await supabase
              .from("content_calendar")
              .select("id", { count: "exact", head: true })
              .eq("network_site_id", site.id);
            const kw = count ?? 0;
            totalKw += kw;
            if (kw >= 100) planned++;
            else pending++;
            statuses.push({ domain: site.domain, niche: site.niche, keywords: kw, status: kw >= 100 ? "✅" : kw > 0 ? "⚠️" : "❌" });
          }
          return { sites: statuses, summary: { total: sites.length, planned, pending, totalKeywords: totalKw } };
        },
      },
    ],
  },

  // ─────── 👤 Usuários ───────
  {
    id: "users",
    label: "Usuários",
    icon: Users,
    probes: [
      {
        id: "users-list",
        label: "Listar usuários (admin)",
        desc: "Todos os profiles com role/plan/status",
        endpoint: "GET /api/admin/users",
        run: () => callJson("/api/admin/users"),
      },
      {
        id: "user-by-email",
        label: "Buscar usuário por email",
        desc: "Lê profile + sites + últimos backlinks do usuário",
        endpoint: "Supabase: profiles + client_sites + backlinks",
        needs: ["userEmail"],
        run: async ({ userEmail }) => {
          const supabase = supabaseClient();
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", userEmail.trim().toLowerCase())
            .maybeSingle();
          if (error || !profile) {
            return { error: error?.message ?? "usuário não encontrado", email: userEmail };
          }
          const { data: sites = [] } = await supabase
            .from("client_sites")
            .select("id, url, niche_primary, da_current, autopilot_active, created_at")
            .eq("user_id", profile.id);
          const siteIds = (sites ?? []).map(s => s.id);
          const { data: backlinks } = siteIds.length
            ? await supabase
                .from("backlinks")
                .select("id, anchor_text, target_url, status, error_message, created_at, network_sites(domain)")
                .in("client_site_id", siteIds)
                .order("created_at", { ascending: false })
                .limit(10)
            : { data: [] };
          return { profile, sites, backlinks_recentes: backlinks };
        },
      },
      {
        id: "users-quick-reset",
        label: "Quick reset (dev)",
        desc: "Reseta dados de teste do usuário atual. CUIDADO: apaga sites/backlinks.",
        endpoint: "POST /api/auth/quick-reset",
        run: () => callJson("/api/auth/quick-reset", { method: "POST" }),
      },
    ],
  },

  // ─────── 💰 Pagamento & Webhooks ───────
  {
    id: "billing",
    label: "Pagamento & Webhooks",
    icon: CreditCard,
    probes: [
      {
        id: "create-checkout",
        label: "Stripe — criar checkout (test)",
        desc: "Cria sessão de checkout (modo teste se chave for sk_test_)",
        endpoint: "POST /api/create-checkout",
        run: () =>
          callJson("/api/create-checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planId: "starter" }),
          }),
      },
      {
        id: "api-monitor",
        label: "Monitor de APIs externas",
        desc: "Status atual + latência de DataForSEO, OpenAI, Stripe, etc.",
        endpoint: "GET /api/admin/api-monitor",
        run: () => callJson("/api/admin/api-monitor"),
      },
      {
        id: "usage",
        label: "API Usage / limites do usuário",
        desc: "Rate limits e uso diário do usuário logado",
        endpoint: "GET /api/usage",
        run: () => callJson("/api/usage"),
      },
      {
        id: "sentry-server",
        label: "Sentry — disparar erro server",
        desc: "Endpoint que sempre dá erro pra validar captura",
        endpoint: "GET /api/admin/sentry-test",
        run: () => callJson("/api/admin/sentry-test"),
      },
      {
        id: "sentry-client",
        label: "Sentry — disparar erro client",
        desc: "Captura no browser (verifica integração frontend)",
        run: async () => {
          const tag = Math.floor(Math.random() * 100000);
          const msg = `Sentry client test #${tag} em ${new Date().toISOString()}`;
          Sentry.withScope(scope => {
            scope.setFingerprint([`sentry-test-client-${tag}`]);
            Sentry.captureException(new Error(msg));
          });
          return { dispatched: true, fingerprint: `sentry-test-client-${tag}`, message: msg };
        },
      },
    ],
  },

  // ─────── 🗄️ Banco ───────
  {
    id: "db",
    label: "Banco",
    icon: Database,
    probes: [
      {
        id: "my-sites",
        label: "Meus sites",
        desc: "Lista client_sites do usuário logado (passa pela RLS)",
        endpoint: "Supabase: client_sites",
        run: async () => {
          const supabase = supabaseClient();
          const { data, error } = await supabase.from("client_sites").select("*");
          return { sites: data, error: error?.message };
        },
      },
      {
        id: "site-detail",
        label: "Detalhe do site (por ID)",
        desc: "Lê client_sites direto do Supabase",
        endpoint: "Supabase: client_sites",
        needs: ["siteId"],
        run: async ({ siteId }) => {
          const supabase = supabaseClient();
          const { data, error } = await supabase.from("client_sites").select("*").eq("id", siteId).single();
          return error ? { error: error.message } : data;
        },
      },
      {
        id: "site-keywords",
        label: "Keywords do site (por ID)",
        desc: "Lê keywords (top 50 por volume) do site informado",
        endpoint: "Supabase: keywords",
        needs: ["siteId"],
        run: async ({ siteId }) => {
          const supabase = supabaseClient();
          const { data, error, count } = await supabase
            .from("keywords")
            .select("*", { count: "exact" })
            .eq("client_site_id", siteId)
            .order("search_volume", { ascending: false })
            .limit(50);
          return { keywords: data, total: count, error: error?.message };
        },
      },
      {
        id: "image-bank",
        label: "Banco de imagens",
        desc: "Imagens cacheadas do find-image (Unsplash + Pexels)",
        endpoint: "Supabase: image_bank",
        run: async () => {
          const supabase = supabaseClient();
          const { data, count } = await supabase
            .from("image_bank")
            .select("id, storage_url, description, tags, used_count, created_at", { count: "exact" })
            .order("used_count", { ascending: false })
            .limit(50);
          return { images: data, total: count };
        },
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────────────────────────────

export default function DiagnosticsPage() {
  const [activeCategoryId, setActiveCategoryId] = useState(CATEGORIES[0].id);
  const [ctx, setCtx] = useState<ProbeContext>({
    domain: "",
    siteId: "",
    userEmail: "",
    clientSite: "",
    clientContext: "",
    networkContext: "",
    blAnchor: "",
    planKeywords: "",
  });
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [resultTab, setResultTab] = useState("tree");
  const [copied, setCopied] = useState(false);
  const [sites, setSites] = useState<Array<{ id: string; url: string; google_refresh_token?: any; github_token?: any; wp_url?: any }>>([]);
  const [sitesLoaded, setSitesLoaded] = useState(false);

  // Filtros da tab Cobertura
  const [coverageSearch, setCoverageSearch] = useState("");
  const [coveragePersona, setCoveragePersona] = useState<"all" | Persona>("all");
  const [coverageCriticity, setCoverageCriticity] = useState<"all" | Criticity>("all");
  const [coverageStatus, setCoverageStatus] = useState<"all" | FeatureStatus>("all");
  const [coverageOnlyUntested, setCoverageOnlyUntested] = useState(false);

  const activeCategory = useMemo(
    () => CATEGORIES.find(c => c.id === activeCategoryId) ?? CATEGORIES[0],
    [activeCategoryId],
  );

  const filteredFeatures = useMemo(() => {
    const q = coverageSearch.trim().toLowerCase();
    return FEATURES.filter(f => {
      if (q && !`${f.id} ${f.label} ${f.page ?? ""} ${f.api ?? ""}`.toLowerCase().includes(q)) return false;
      if (coveragePersona !== "all" && f.persona !== coveragePersona) return false;
      if (coverageCriticity !== "all" && f.criticity !== coverageCriticity) return false;
      if (coverageStatus !== "all" && f.status !== coverageStatus) return false;
      if (coverageOnlyUntested && !!f.testFile) return false;
      return true;
    });
  }, [coverageSearch, coveragePersona, coverageCriticity, coverageStatus, coverageOnlyUntested]);

  const globalStats = useMemo(() => coverageStats(), []);

  // Carrega lista de sites do usuário pra picker
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("client_sites")
        .select("id, url, google_refresh_token, github_token, wp_url")
        .eq("user_id", user.id);
      if (cancelled) return;
      setSites(data ?? []);
      setSitesLoaded(true);
      if (data?.[0] && !ctx.siteId) {
        setCtx(prev => ({ ...prev, siteId: data[0].id }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateCtx = <K extends keyof ProbeContext>(k: K, v: ProbeContext[K]) =>
    setCtx(prev => ({ ...prev, [k]: v }));

  const runProbe = async (probe: Probe) => {
    // Valida inputs obrigatórios
    if (probe.needs?.includes("domain") && !ctx.domain.trim()) {
      toast.error("Preencha o campo Domínio / keyword.");
      return;
    }
    if (probe.needs?.includes("siteId") && !ctx.siteId.trim()) {
      toast.error("Selecione um site (ou cole um Site ID).");
      return;
    }
    if (probe.needs?.includes("userEmail") && !ctx.userEmail.trim()) {
      toast.error("Preencha o email do usuário.");
      return;
    }

    setRunning(probe.id);
    setResult(null);
    const startedAt = Date.now();
    try {
      const data = await probe.run(ctx);
      setResult({
        probeId: probe.id,
        data,
        durationMs: Date.now() - startedAt,
        status: data?.error || data?._httpStatus >= 400 ? "error" : "ok",
        startedAt,
      });
    } catch (err) {
      setResult({
        probeId: probe.id,
        data: { error: String(err) },
        durationMs: Date.now() - startedAt,
        status: "error",
        startedAt,
      });
    }
    setRunning(null);
  };

  const copyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.data, null, 2));
    setCopied(true);
    toast.success("JSON copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const showsArticleGen = activeCategory.extraInputs?.includes("articleGen");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-[family-name:var(--font-display)] tracking-tight">Diagnostics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Console de probe de APIs e queries. Use pra investigar comportamento real, achar regressão, e exportar fixture pra testes.
        </p>
      </div>

      {/* Tabs de categoria */}
      <Tabs value={activeCategoryId} onValueChange={setActiveCategoryId}>
        <TabsList className="flex flex-wrap h-auto p-1 gap-1">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5 text-xs">
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
                <Badge variant="outline" className="text-[9px] ml-1 px-1.5 h-4">{cat.probes.length}</Badge>
              </TabsTrigger>
            );
          })}
          <TabsTrigger value="coverage" className="gap-1.5 text-xs">
            <Target className="w-3.5 h-3.5" />
            Cobertura
            <Badge variant="outline" className="text-[9px] ml-1 px-1.5 h-4">
              {globalStats.tested}/{globalStats.total}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {CATEGORIES.map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="space-y-4 mt-4">
            {/* Inputs panel */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                      Domínio / Keyword (URL ou termo de busca)
                    </Label>
                    <Input
                      placeholder="contadora.com.br ou 'o que é drywall'"
                      value={ctx.domain}
                      onChange={e => updateCtx("domain", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                      Site ID (pra probes que precisam de integração conectada)
                    </Label>
                    <Input
                      placeholder="uuid do site"
                      value={ctx.siteId}
                      onChange={e => updateCtx("siteId", e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Picker de sites */}
                {sitesLoaded && sites.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {sites.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateCtx("siteId", s.id)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono cursor-pointer transition-all ${
                          ctx.siteId === s.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s.url?.replace(/^https?:\/\//, "") ?? s.id.slice(0, 8)}
                        <span className="ml-1.5 opacity-60">
                          {[s.google_refresh_token && "G", s.github_token && "GH", s.wp_url && "WP"].filter(Boolean).join(" ")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Email pra lookup de usuário */}
                {cat.id === "users" && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                      Email do usuário (lookup)
                    </Label>
                    <Input
                      placeholder="cliente@exemplo.com"
                      value={ctx.userEmail}
                      onChange={e => updateCtx("userEmail", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                )}

                {/* Inputs extras pra geração de artigo */}
                {showsArticleGen && (
                  <div className="pt-3 border-t border-border space-y-3">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider font-mono">
                      Inputs extras — geração de artigo com backlink
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Site do cliente</Label>
                        <Input placeholder="https://cliente.com.br" value={ctx.clientSite} onChange={e => updateCtx("clientSite", e.target.value)} className="font-mono text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Âncora do backlink</Label>
                        <Input placeholder="avaliação de imóveis" value={ctx.blAnchor} onChange={e => updateCtx("blAnchor", e.target.value)} className="text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Contexto do cliente</Label>
                        <Input placeholder="Empresa de avaliação de imóveis..." value={ctx.clientContext} onChange={e => updateCtx("clientContext", e.target.value)} className="text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Contexto da rede</Label>
                        <Input placeholder="Blog sobre arquitetura e decoração" value={ctx.networkContext} onChange={e => updateCtx("networkContext", e.target.value)} className="text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
                        Planejamento de keywords (uma por linha)
                      </Label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none resize-y"
                        placeholder={"melhores praias do nordeste\ncomo tirar passaporte\nquanto custa intercâmbio"}
                        value={ctx.planKeywords}
                        onChange={e => updateCtx("planKeywords", e.target.value)}
                      />
                      <p className="text-[9px] text-muted-foreground/60">
                        {ctx.planKeywords.split("\n").filter(l => l.trim()).length} keywords
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Probes grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {cat.probes.map(probe => {
                const isRunning = running === probe.id;
                const blocked =
                  (probe.needs?.includes("domain") && !ctx.domain.trim()) ||
                  (probe.needs?.includes("siteId") && !ctx.siteId.trim()) ||
                  (probe.needs?.includes("userEmail") && !ctx.userEmail.trim());
                return (
                  <button
                    key={probe.id}
                    type="button"
                    onClick={() => runProbe(probe)}
                    disabled={!!running || blocked}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isRunning ? "bg-primary/10 border-primary/30" : "bg-card border-border hover:border-primary/20 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" /> : <Play className="w-3 h-3 text-muted-foreground shrink-0" />}
                      <p className="text-xs font-semibold flex-1 leading-snug">{probe.label}</p>
                      {probe.cost && <span className="text-[9px] font-mono text-warning">{probe.cost}</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">{probe.desc}</p>
                    {probe.endpoint && <p className="text-[9px] font-mono text-muted-foreground/60 truncate w-full">{probe.endpoint}</p>}
                    {probe.needs && probe.needs.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {probe.needs.map(n => (
                          <Badge key={n} variant="outline" className="text-[8px] py-0 px-1.5 h-3.5">{n}</Badge>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Result panel */}
            {result && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant={result.status === "error" ? "destructive" : "success"} className="text-[10px]">
                        {result.status === "error" ? "Erro" : "OK"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">{result.probeId}</Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">{(result.durationMs / 1000).toFixed(2)}s</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tabs value={resultTab} onValueChange={setResultTab}>
                        <TabsList className="h-7">
                          <TabsTrigger value="tree" className="text-[10px] h-5 px-2">Tree</TabsTrigger>
                          <TabsTrigger value="raw" className="text-[10px] h-5 px-2">Raw JSON</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-[10px]" onClick={copyJson}>
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copiado!" : "Copiar"}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/20 rounded-lg p-3 max-h-[60vh] overflow-auto">
                    {resultTab === "tree" ? (
                      <JsonTree data={result.data} defaultExpandDepth={1} />
                    ) : (
                      <pre className="text-[11px] font-mono whitespace-pre-wrap break-words">{JSON.stringify(result.data, null, 2)}</pre>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}

        {/* ─────── Cobertura de Testes ─────── */}
        <TabsContent value="coverage" className="space-y-4 mt-4">
          {/* Stats summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <CoverageStat label="Total" value={String(globalStats.total)} hint="features mapeadas" />
            <CoverageStat
              label="Testadas"
              value={`${globalStats.tested}/${globalStats.total}`}
              hint={`${globalStats.pctTested}%`}
              tone={globalStats.pctTested >= 50 ? "success" : globalStats.pctTested >= 20 ? "warning" : "danger"}
            />
            <CoverageStat
              label="🔴 Críticas testadas"
              value={`${globalStats.highTested}/${globalStats.high}`}
              hint={`${globalStats.pctHighTested}%`}
              tone={globalStats.pctHighTested >= 80 ? "success" : globalStats.pctHighTested >= 40 ? "warning" : "danger"}
            />
            <CoverageStat label="🟡 Médias" value={String(globalStats.medium)} />
            <CoverageStat label="🐛 Bugs abertos" value={String(globalStats.bugs)} tone={globalStats.bugs > 0 ? "danger" : "success"} />
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  placeholder="Buscar por id, nome, rota..."
                  value={coverageSearch}
                  onChange={e => setCoverageSearch(e.target.value)}
                  className="text-sm flex-1 min-w-[200px]"
                />
                <select
                  value={coveragePersona}
                  onChange={e => setCoveragePersona(e.target.value as any)}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="all">Todas as personas</option>
                  {Object.entries(PERSONA_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
                <select
                  value={coverageCriticity}
                  onChange={e => setCoverageCriticity(e.target.value as any)}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="all">Todas as criticidades</option>
                  {Object.entries(CRITICITY_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
                <select
                  value={coverageStatus}
                  onChange={e => setCoverageStatus(e.target.value as any)}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="all">Todos os status</option>
                  {Object.entries(STATUS_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={coverageOnlyUntested}
                    onChange={e => setCoverageOnlyUntested(e.target.checked)}
                    className="cursor-pointer"
                  />
                  Só não testadas
                </label>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  {filteredFeatures.length} resultado{filteredFeatures.length === 1 ? "" : "s"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">ID</th>
                      <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Feature</th>
                      <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Persona</th>
                      <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Crit.</th>
                      <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Tipo</th>
                      <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Arquivo de teste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeatures.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                          Nenhuma feature encontrada com esses filtros.
                        </td>
                      </tr>
                    ) : (
                      filteredFeatures.map(f => (
                        <tr
                          key={f.id}
                          className={`border-b border-border/30 hover:bg-muted/20 transition-colors ${
                            f.status === "bug" ? "bg-destructive/5" : ""
                          }`}
                        >
                          <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{f.id}</td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-[11px]">{f.label}</div>
                            {(f.page || f.api) && (
                              <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5 truncate max-w-[280px]">
                                {f.page ?? f.api}
                              </div>
                            )}
                            {f.notes && (
                              <div className="text-[10px] text-warning/80 mt-0.5 italic">{f.notes}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-[10px] text-muted-foreground whitespace-nowrap">{PERSONA_LABEL[f.persona]}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="text-[10px]">{CRITICITY_LABEL[f.criticity]}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <Badge
                              variant={
                                f.status === "bug" ? "destructive" :
                                f.status === "ok" ? "success" :
                                f.status === "new" ? "info" : "outline"
                              }
                              className="text-[9px]"
                            >
                              {STATUS_LABEL[f.status]}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-[9px] font-mono">{f.testType}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            {f.testFile ? (
                              <span className="font-mono text-[10px] text-success">{f.testFile}</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60 italic">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CoverageStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success" ? "text-success" :
    tone === "warning" ? "text-warning" :
    tone === "danger" ? "text-destructive" :
    "text-foreground";
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold font-[family-name:var(--font-display)] ${toneClass}`}>{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground/70 font-mono">{hint}</p>}
      </CardContent>
    </Card>
  );
}
