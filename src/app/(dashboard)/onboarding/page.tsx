"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Globe, Search, ArrowRight, ArrowLeft, Check, Zap, Loader2,
  Link as LinkIcon, TrendingUp, Sparkles, Target, Plus,
  BarChart3, Shield, Eye, FileText, MessageSquare, Pen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

const STEPS = ["url", "google", "gsc-select", "ga-select", "analysis", "context", "niche", "voice", "keywords"];

const NICHE_OPTIONS = [
  "Tecnologia", "Saúde", "Finanças", "Educação", "E-commerce",
  "Marketing", "Jurídico", "Imobiliário", "Alimentação", "Automotivo",
  "Moda", "Beleza", "Pets", "Viagem", "Esportes",
  "Jogos", "Infantil", "Agronegócio", "Construção", "Sustentabilidade",
];

const TONE_OPTIONS = [
  { id: "informal", label: "Informal e direto", desc: "Conversa de amigo, sem frescura" },
  { id: "professional", label: "Profissional", desc: "Sério mas acessível" },
  { id: "technical", label: "Técnico", desc: "Detalhado, com termos da área" },
  { id: "educational", label: "Educativo", desc: "Didático, passo a passo" },
];

const CONTENT_TYPE_OPTIONS = [
  { id: "tutorials", label: "Tutoriais / Como fazer" },
  { id: "lists", label: "Listas / Rankings" },
  { id: "reviews", label: "Análises / Reviews" },
  { id: "news", label: "Notícias / Atualidades" },
  { id: "guides", label: "Guias completos" },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [siteUrl, setSiteUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);

  // Google
  const [googleConnected, setGoogleConnected] = useState(false);
  const [gscSites, setGscSites] = useState<Array<{ siteUrl: string }>>([]);
  const [gaProperties, setGaProperties] = useState<Array<{ id: string; displayName: string }>>([]);
  const [selectedGSC, setSelectedGSC] = useState("");
  const [selectedGA, setSelectedGA] = useState("");
  const [loadingGscSites, setLoadingGscSites] = useState(false);

  // Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<{ label: string; done: boolean }[]>([]);
  const [da, setDa] = useState(0);
  const [backlinks, setBacklinks] = useState(0);
  const [avgCpc, setAvgCpc] = useState(0);
  const [competitors, setCompetitors] = useState<{ domain: string }[]>([]);

  // Scraping + context
  const [scrapeData, setScrapeData] = useState<any>(null);
  const [gptSummary, setGptSummary] = useState("");
  const [mainTopics, setMainTopics] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(0);

  // Keywords
  const [keywordsToMonitor, setKeywordsToMonitor] = useState<any[]>([]);
  const keywordsLoadedRef = useRef(false);
  const [kwPage, setKwPage] = useState(0);
  const KW_PER_PAGE = 20;

  // Niche
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [suggestedNiches, setSuggestedNiches] = useState<string[]>([]);
  const [customNiche, setCustomNiche] = useState("");

  // Voice / preferences
  const [tone, setTone] = useState("");
  const [contentType, setContentType] = useState("");
  const [audience, setAudience] = useState("");
  const [voiceNotes, setVoiceNotes] = useState("");

  const currentStep = STEPS[step];
  const toggleNiche = (n: string) => setSelectedNiches(prev => prev.includes(n) ? prev.filter(x => x !== n) : prev.length >= 3 ? (toast("Máximo 3"), prev) : [...prev, n]);

  // Load siteId if returning from OAuth
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("client_sites").select("id, url, google_refresh_token").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      if (data?.[0]) {
        setSiteId(data[0].id);
        if (!siteUrl) setSiteUrl(data[0].url);
        if (data[0].google_refresh_token) setGoogleConnected(true);
      }
    })();
  }, []);

  // Handle OAuth return
  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "google_connected") {
      setGoogleConnected(true);
      toast.success("Google conectado!");
      setStep(2);
      setTimeout(() => loadGscSites(), 300);
    }
  }, [searchParams]);

  const createSite = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const url = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
    const { data } = await supabase.from("client_sites").insert({ user_id: user.id, url, phase: "planting", autopilot_active: true, seo_score: 0, da_current: 0 }).select().single();
    if (data) { setSiteId(data.id); setStep(1); }
    else toast.error("Erro ao criar site");
  };

  const loadGscSites = async () => {
    setLoadingGscSites(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingGscSites(false); return; }
    const { data: sites } = await supabase.from("client_sites").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
    const sid = sites?.[0]?.id;
    if (!sid) { setLoadingGscSites(false); return; }
    setSiteId(sid);
    try {
      const res = await fetch(`/api/integrations/google-properties?siteId=${sid}`);
      const data = await res.json();
      if (data.gscSites) setGscSites(data.gscSites);
      if (data.gaProperties) setGaProperties(data.gaProperties);
    } catch {}
    setLoadingGscSites(false);
  };

  const saveGscSelection = async () => {
    if (!siteId || !selectedGSC) return;
    await fetch("/api/integrations/google-properties", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, gscSiteUrl: selectedGSC }),
    });
    setStep(3);
  };

  const saveGaAndAnalyze = async () => {
    if (!siteId) return;
    if (selectedGA) {
      await fetch("/api/integrations/google-properties", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, gaPropertyId: selectedGA }),
      });
    }
    setStep(4);
    runAnalysis();
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisSteps([]);
    const steps = ["Escaneando seu site...", "Analisando autoridade...", "Buscando suas keywords...", "Identificando concorrentes..."];
    steps.forEach((label, i) => {
      setTimeout(() => {
        setAnalysisSteps(prev => [...prev, { label, done: false }]);
        setTimeout(() => {
          setAnalysisSteps(prev => prev.map((s, j) => j === i ? { ...s, done: true } : s));
          if (i === steps.length - 1) setTimeout(() => { setAnalyzing(false); setAnalysisComplete(true); }, 500);
        }, 800);
      }, i * 1000);
    });

    // Parallel: scrape site + GSC keywords + analyze-site
    const scrapePromise = fetch("/api/integrations/scrape-site", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: siteUrl }),
    }).then(r => r.json()).catch(() => null);

    let gscTopKeywords: string[] = [];
    if (googleConnected && siteId) {
      try {
        const res = await fetch(`/api/integrations/gsc-data?siteId=${siteId}&period=90`);
        const gsc = await res.json();
        if (gsc.keywords?.length) {
          const allKws = gsc.keywords
            .map((k: any) => ({ keyword: k.keyword, volume: k.impressions ?? 0, difficulty: 0, position: k.position ? Math.round(k.position) : 999, clicks: k.clicks, impressions: k.impressions }))
            .sort((a: any, b: any) => (b.clicks ?? 0) - (a.clicks ?? 0));
          setKeywordsToMonitor(allKws);
          keywordsLoadedRef.current = true;
          gscTopKeywords = allKws.slice(0, 10).map((k: any) => k.keyword);
        }
      } catch {}
    }

    // Analyze site (AP, backlinks, CPC, nicho)
    try {
      const res = await fetch("/api/analyze-site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: siteUrl, hasGscKeywords: keywordsLoadedRef.current, gscKeywords: gscTopKeywords.length > 0 ? gscTopKeywords : undefined }) });
      const df = await res.json();
      if (!df.error) {
        setDa(df.da ?? 0); setBacklinks(df.backlinks ?? 0); setAvgCpc(df.avgCpc ?? 0);
        setCompetitors(df.competitors ?? []);
        if (!keywordsLoadedRef.current && df.keywords?.length) {
          setKeywordsToMonitor(df.keywords.map((k: any) => ({ ...k, checked: true })));
        }
      }
    } catch {}

    // Wait for scrape
    const scrape = await scrapePromise;
    if (scrape && !scrape.error) {
      setScrapeData(scrape);
      setGptSummary(scrape.gptSummary ?? "");
      setMainTopics(scrape.mainTopics ?? []);
      setTotalPages(scrape.totalPages ?? 0);
      if (scrape.suggestedNiches?.length) {
        const valid = scrape.suggestedNiches.filter((n: string) => n !== "Geral" && NICHE_OPTIONS.includes(n));
        setSuggestedNiches(valid);
        if (valid.length > 0) setSelectedNiches([valid[0]]);
      }
    }

    // Cache backlinks
    if (siteId) {
      try { await fetch(`/api/integrations/external-backlinks?siteId=${siteId}`); } catch {}
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const siteContext = {
        pages: scrapeData?.pages ?? [],
        totalPages: totalPages,
        source: scrapeData?.source ?? "none",
        gptSummary: gptSummary,
        mainTopics: mainTopics,
        tone,
        toneLabel: TONE_OPTIONS.find(t => t.id === tone)?.label ?? tone,
        contentType,
        contentTypeLabel: CONTENT_TYPE_OPTIONS.find(t => t.id === contentType)?.label ?? contentType,
        audience,
        notes: voiceNotes,
        scrapedAt: new Date().toISOString().split("T")[0],
      };

      if (siteId) {
        await supabase.from("client_sites").update({
          niche_primary: selectedNiches[0] || customNiche || "Geral",
          niche_secondary: selectedNiches[1] || null,
          da_current: da,
          da_history: da > 0 ? [{ date: new Date().toISOString().split("T")[0], value: da }] : [],
          avg_cpc: avgCpc,
          site_context: siteContext,
        }).eq("id", siteId);
      }

      // Save keywords
      if (siteId && keywordsToMonitor.length > 0) {
        const all = keywordsToMonitor.map((k: any) => ({
          client_site_id: siteId, keyword: k.keyword,
          search_volume: k.volume || k.impressions || 0,
          difficulty: k.difficulty || 0, position_current: k.position,
          source: "gsc" as const,
        }));
        try { await supabase.from("keywords").insert(all); } catch {}
      }
      if (siteId && competitors.length > 0) {
        try { await supabase.from("competitors").insert(competitors.map(c => ({ client_site_id: siteId, domain: c.domain, da: 0, detected_automatically: true }))); } catch {}
      }

      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
      toast.success("Site configurado!");
      router.push("/integrations/setup");
    } catch { toast.error("Erro."); setSaving(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Steps */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${i < step ? 'bg-primary text-primary-foreground' : i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 'bg-muted text-muted-foreground'}`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-6 h-0.5 rounded ${i < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── 1. URL ── */}
          {currentStep === "url" && (
            <motion.div key="url" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_32px_hsl(24_100%_55%/0.15)]">
                  <Globe className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">Qual é o seu site?</h1>
                <p className="text-muted-foreground">Cole a URL do site que quer ranquear no Google.</p>
              </div>
              <div className="card-beam rounded-2xl border bg-card p-8 relative overflow-hidden">
                <Input placeholder="https://meusite.com.br" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} className="h-12 text-base mb-4" onKeyDown={(e) => e.key === "Enter" && siteUrl.trim() && createSite()} />
                <Button size="xl" className="w-full" disabled={!siteUrl.trim()} onClick={createSite}>Continuar <ArrowRight className="w-4 h-4" /></Button>
              </div>
            </motion.div>
          )}

          {/* ── 2. Google ── */}
          {currentStep === "google" && (
            <motion.div key="google" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-[#4285F4]/10 ring-1 ring-[#4285F4]/30 flex items-center justify-center mx-auto mb-5">
                  <Search className="w-7 h-7 text-[#4285F4]" />
                </div>
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">Google Search Console</h1>
                <p className="text-muted-foreground">Conecte para ver suas keywords e posições reais.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-5">
                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">O que você vai ver:</p>
                  {[{ icon: Search, text: "Todas as palavras que trazem visitantes" }, { icon: TrendingUp, text: "Sua posição exata no Google" }, { icon: Eye, text: "Quantos cliques e impressões" }].map((item, i) => (
                    <div key={i} className="flex items-start gap-3"><item.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" /><p className="text-sm text-muted-foreground">{item.text}</p></div>
                  ))}
                </div>
                <Button className="w-full" size="lg" onClick={() => window.location.href = `/api/auth/google?siteId=${siteId}&redirect=/onboarding`}>
                  <Search className="w-4 h-4" /> Conectar Google
                </Button>
                <div className="text-center">
                  <button className="text-muted-foreground/60 text-xs hover:text-muted-foreground cursor-pointer" onClick={() => { setStep(4); runAnalysis(); }}>Pular — analisar sem Google</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── 3. GSC select ── */}
          {currentStep === "gsc-select" && (
            <motion.div key="gsc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">Search Console</h1>
                <p className="text-muted-foreground">Selecione o site que corresponde a <span className="text-foreground font-semibold">{siteUrl.replace(/^https?:\/\//, "")}</span></p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-4">
                {loadingGscSites ? <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : gscSites.length > 0 ? (
                  <div className="space-y-2">
                    {gscSites.map(s => (
                      <div key={s.siteUrl} onClick={() => setSelectedGSC(s.siteUrl)} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${selectedGSC === s.siteUrl ? 'bg-primary-light ring-1 ring-primary/20' : 'bg-muted/30 hover:bg-muted/50'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedGSC === s.siteUrl ? 'bg-primary border-primary' : 'border-border-strong'}`}>
                          {selectedGSC === s.siteUrl && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <Globe className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">{s.siteUrl}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-center py-6"><p className="text-sm text-muted-foreground mb-3">Nenhum site encontrado.</p><Button variant="outline" size="sm" onClick={loadGscSites}>Tentar novamente</Button></div>}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /> Voltar</Button>
                  <Button onClick={saveGscSelection} disabled={!selectedGSC}>Continuar <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── 4. GA select ── */}
          {currentStep === "ga-select" && (
            <motion.div key="ga" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-[#F9AB00]/10 ring-1 ring-[#F9AB00]/30 flex items-center justify-center mx-auto mb-5">
                  <BarChart3 className="w-7 h-7 text-[#F9AB00]" />
                </div>
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">Google Analytics</h1>
                <p className="text-muted-foreground">Selecione a propriedade do Analytics para ver o tráfego.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-4">
                {gaProperties.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {gaProperties.map(p => (
                      <div key={p.id} onClick={() => setSelectedGA(selectedGA === p.id ? "" : p.id)} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${selectedGA === p.id ? 'bg-primary-light ring-1 ring-primary/20' : 'bg-muted/30 hover:bg-muted/50'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedGA === p.id ? 'bg-primary border-primary' : 'border-border-strong'}`}>
                          {selectedGA === p.id && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <BarChart3 className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{p.displayName}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-6">Nenhuma propriedade GA4 encontrada.</p>}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4" /> Voltar</Button>
                  <Button onClick={saveGaAndAnalyze}>{selectedGA ? "Continuar" : "Pular"} <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── 5. Analysis ── */}
          {currentStep === "analysis" && (
            <motion.div key="analysis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">{analyzing ? "Analisando seu site..." : "Análise completa!"}</h1>
                <p className="text-muted-foreground font-mono text-sm">{siteUrl.replace(/^https?:\/\//, "")}</p>
              </div>
              <div className="rounded-2xl border bg-card p-8 space-y-4">
                <div className="space-y-3">
                  {analysisSteps.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
                      {s.done ? <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-success" /></div> : <Loader2 className="w-6 h-6 text-primary animate-spin" />}
                      <span className={`text-sm ${s.done ? '' : 'text-primary'}`}>{s.label}</span>
                    </motion.div>
                  ))}
                </div>
                {analysisComplete && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-muted/30 rounded-xl p-4 text-center">
                        <Shield className="w-5 h-5 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-black font-[family-name:var(--font-display)]"><NumberTicker value={da} /></p>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase mt-1">DA</p>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-4 text-center">
                        <LinkIcon className="w-5 h-5 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-black font-[family-name:var(--font-display)]"><NumberTicker value={backlinks} /></p>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase mt-1">Backlinks</p>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-4 text-center">
                        <FileText className="w-5 h-5 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-black font-[family-name:var(--font-display)]"><NumberTicker value={totalPages} /></p>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase mt-1">Páginas</p>
                      </div>
                    </div>
                    <Button size="lg" className="w-full" onClick={() => setStep(5)}>Continuar <ArrowRight className="w-4 h-4" /></Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── 6. Context confirmation ── */}
          {currentStep === "context" && (
            <motion.div key="context" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">Sobre o seu site</h1>
                <p className="text-muted-foreground">Com base nas {totalPages} páginas que encontramos, esse é o resumo do seu site. Confirme ou edite.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-5">
                {/* GPT summary — editable */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2 block">Resumo do seu site</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none input-glow resize-y"
                    value={gptSummary}
                    onChange={(e) => setGptSummary(e.target.value)}
                    placeholder="Descreva do que se trata o seu site..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">Edite se necessário — isso será usado pra criar backlinks mais relevantes.</p>
                </div>

                {/* Main topics */}
                {mainTopics.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2 block">Principais temas detectados</Label>
                    <div className="flex flex-wrap gap-2">
                      {mainTopics.map((topic, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample pages */}
                {scrapeData?.pages?.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2 block">Páginas encontradas (amostra)</Label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {scrapeData.pages.slice(0, 10).map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-1">
                          <span className="text-muted-foreground font-mono truncate w-32 shrink-0">{p.url}</span>
                          <span className="truncate">{p.title}</span>
                        </div>
                      ))}
                      {scrapeData.pages.length > 10 && <p className="text-[10px] text-muted-foreground">...e mais {scrapeData.pages.length - 10} páginas</p>}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setStep(4)}><ArrowLeft className="w-4 h-4" /> Voltar</Button>
                  <Button onClick={() => setStep(6)}>Confirmar e continuar <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── 7. Niche ── */}
          {currentStep === "niche" && (
            <motion.div key="niche" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">Qual é o nicho do seu site?</h1>
                <p className="text-muted-foreground">Isso nos ajuda a encontrar os melhores parceiros de backlink.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-5">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2 block">Digite o nicho do seu site</Label>
                  <Input placeholder="Ex: Marketing Digital, Receitas Fitness..." value={customNiche} onChange={(e) => setCustomNiche(e.target.value)} className="h-11" />
                </div>
                {suggestedNiches.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider font-mono mb-3 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Sugerido com base no seu site</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedNiches.map(n => (
                        <button key={n} onClick={() => { toggleNiche(n); setCustomNiche(""); }} className={`px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all ${selectedNiches.includes(n) ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : 'bg-primary-light text-primary'}`}>
                          {selectedNiches.includes(n) && <Check className="w-3.5 h-3.5 inline mr-1.5" />}{n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3">Ou selecione da lista</p>
                  <div className="flex flex-wrap gap-2">
                    {NICHE_OPTIONS.filter(n => !suggestedNiches.includes(n)).map(n => (
                      <button key={n} onClick={() => { toggleNiche(n); setCustomNiche(""); }} className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${selectedNiches.includes(n) ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {selectedNiches.includes(n) && <Check className="w-3 h-3 inline mr-1" />}{n}
                      </button>
                    ))}
                  </div>
                </div>
                {(selectedNiches.length > 0 || customNiche.trim()) && (
                  <div className="bg-muted/30 rounded-xl p-3">
                    {customNiche.trim() ? <Badge variant="default" className="text-xs">Nicho: {customNiche}</Badge> : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNiches.map((n, i) => <Badge key={n} variant={i === 0 ? "default" : "outline"} className="text-xs">{i === 0 ? "Principal" : "Secundário"}: {n}</Badge>)}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setStep(5)}><ArrowLeft className="w-4 h-4" /> Voltar</Button>
                  <Button onClick={() => setStep(7)} disabled={selectedNiches.length === 0 && !customNiche.trim()}>Continuar <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── 8. Voice + preferences ── */}
          {currentStep === "voice" && (
            <motion.div key="voice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center mx-auto mb-5">
                  <MessageSquare className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">Como você quer ser mencionado?</h1>
                <p className="text-muted-foreground">Isso define o tom dos artigos que vão linkar pro seu site.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-5">
                {/* Tone */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3 block">Tom de voz</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONE_OPTIONS.map(t => (
                      <button key={t.id} onClick={() => setTone(t.id)}
                        className={`p-3 rounded-xl text-left cursor-pointer transition-all ${tone === t.id ? 'bg-primary-light ring-1 ring-primary/20' : 'bg-muted/30 hover:bg-muted/50'}`}>
                        <p className="text-sm font-semibold">{t.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content type */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3 block">Tipo de conteúdo preferido</Label>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_TYPE_OPTIONS.map(c => (
                      <button key={c.id} onClick={() => setContentType(c.id)}
                        className={`px-4 py-2 rounded-xl text-sm cursor-pointer transition-all ${contentType === c.id ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {contentType === c.id && <Check className="w-3 h-3 inline mr-1.5" />}{c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audience */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2 block">Quem é seu público?</Label>
                  <Input placeholder="Ex: Iniciantes em marketing, empresários, donas de casa..." value={audience} onChange={(e) => setAudience(e.target.value)} />
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2 block">Algo mais que devemos saber? (opcional)</Label>
                  <textarea
                    className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none input-glow resize-y"
                    placeholder="Ex: Não usar gírias, evitar termos técnicos, sempre citar fontes..."
                    value={voiceNotes}
                    onChange={(e) => setVoiceNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setStep(6)}><ArrowLeft className="w-4 h-4" /> Voltar</Button>
                  <Button onClick={() => setStep(8)}>Continuar <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── 9. Keywords ── */}
          {currentStep === "keywords" && (
            <motion.div key="keywords" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">Suas palavras no Google</h1>
                <p className="text-muted-foreground">
                  {keywordsToMonitor.length > 0 ? `Encontramos ${keywordsToMonitor.length.toLocaleString()} keywords. Todas serão monitoradas.` : "Nenhuma keyword encontrada ainda — elas aparecerão conforme seu site cresce."}
                </p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-4">
                {keywordsToMonitor.length > 0 && (() => {
                  const kwTotalPages = Math.ceil(keywordsToMonitor.length / KW_PER_PAGE);
                  const kwPageItems = keywordsToMonitor.slice(kwPage * KW_PER_PAGE, (kwPage + 1) * KW_PER_PAGE);
                  return (
                    <>
                      <div className="space-y-1">
                        {kwPageItems.map((kw: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-mono font-bold w-8 ${kw.position <= 10 ? 'text-success' : kw.position <= 30 ? 'text-primary' : 'text-muted-foreground'}`}>#{kw.position}</span>
                              <span>{kw.keyword}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                              {kw.clicks !== undefined && <span>{kw.clicks} cliques</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {kwTotalPages > 1 && (
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-muted-foreground font-mono">{kwPage * KW_PER_PAGE + 1}–{Math.min((kwPage + 1) * KW_PER_PAGE, keywordsToMonitor.length)} de {keywordsToMonitor.length}</p>
                          <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={kwPage === 0} onClick={() => setKwPage(p => p - 1)}>Anterior</Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={kwPage >= kwTotalPages - 1} onClick={() => setKwPage(p => p + 1)}>Próximo</Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setStep(7)}><ArrowLeft className="w-4 h-4" /> Voltar</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <>Finalizar configuração <ArrowRight className="w-4 h-4" /></>}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}
