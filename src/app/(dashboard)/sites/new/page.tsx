"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Globe, Search, ArrowRight, ArrowLeft, Check, Zap, Loader2,
  Link as LinkIcon, TrendingUp, Sparkles, Tag, Target, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { createClient } from "@/lib/supabase/client";
import { PLANS } from "@/lib/constants";

const STEPS = ["url", "analysis", "niche", "keywords"];

const NICHE_OPTIONS = [
  "Tecnologia", "Saúde", "Finanças", "Educação", "E-commerce",
  "Marketing", "Jurídico", "Imobiliário", "Alimentação", "Automotivo",
  "Moda", "Beleza", "Pets", "Viagem", "Esportes",
  "Jogos", "Infantil", "Agronegócio", "Construção", "Sustentabilidade",
];

interface RankedKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
  position: number | null;
}

export default function NewSitePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [siteUrl, setSiteUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<{ label: string; done: boolean }[]>([]);
  const [saving, setSaving] = useState(false);

  // Analysis results
  const [da, setDa] = useState(0);
  const [backlinks, setBacklinks] = useState(0);
  const [referringDomains, setReferringDomains] = useState(0);
  const [topKeywords, setTopKeywords] = useState<RankedKeyword[]>([]);
  const [competitors, setCompetitors] = useState<{ domain: string }[]>([]);

  // Niche
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [suggestedNiches, setSuggestedNiches] = useState<string[]>([]);
  const [customNiche, setCustomNiche] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  // Keywords
  const [keywordsToMonitor, setKeywordsToMonitor] = useState<Array<RankedKeyword & { checked: boolean }>>([]);
  const [newKeywordsText, setNewKeywordsText] = useState("");

  const currentStep = STEPS[step];

  const parseNewKeywords = (): string[] => {
    if (!newKeywordsText.trim()) return [];
    return newKeywordsText.split(/[,\n]+/).map(k => k.trim().toLowerCase()).filter(k => k.length > 1);
  };

  const toggleNiche = (niche: string) => {
    setSelectedNiches(prev => {
      if (prev.includes(niche)) return prev.filter(n => n !== niche);
      if (prev.length >= 3) { toast("Máximo 3 nichos"); return prev; }
      return [...prev, niche];
    });
  };

  const startAnalysis = () => {
    setAnalyzing(true);
    setAnalysisSteps([]);
    const steps = ["Verificando site...", "Analisando autoridade...", "Buscando posições...", "Identificando concorrentes..."];
    steps.forEach((label, i) => {
      setTimeout(() => {
        setAnalysisSteps(prev => [...prev, { label, done: false }]);
        setTimeout(() => {
          setAnalysisSteps(prev => prev.map((s, j) => j === i ? { ...s, done: true } : s));
          if (i === steps.length - 1) setTimeout(() => { setAnalyzing(false); setAnalysisComplete(true); }, 500);
        }, 800);
      }, i * 1000);
    });

    fetch("/api/analyze-site", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: siteUrl }) })
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setDa(data.da ?? 0);
          setBacklinks(data.backlinks ?? 0);
          setReferringDomains(data.referringDomains ?? 0);
          setCompetitors(data.competitors ?? []);
          const kws = (data.keywords ?? []).filter((k: any) => k.position && k.position <= 100).sort((a: any, b: any) => (a.position ?? 999) - (b.position ?? 999)).slice(0, 10);
          setTopKeywords(kws);
          setKeywordsToMonitor((data.keywords ?? []).map((k: any, i: number) => ({ ...k, checked: i < 5 })));
          const suggestions = data.nicheSuggestions ?? [];
          if (suggestions.length > 0) { setSuggestedNiches(suggestions); setSelectedNiches([suggestions[0]]); }
        }
      }).catch(() => {});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Sessão expirada."); return; }

      // Check subscription status
      const { data: profile } = await supabase.from("profiles").select("plan_id, subscription_status").eq("id", user.id).single();
      if (!profile || !["active", "trialing"].includes(profile.subscription_status)) {
        toast.error("Sua assinatura não está ativa. Ative seu plano para adicionar sites.");
        setSaving(false);
        return;
      }

      // Check site limit
      const planId = (profile.plan_id || "starter") as keyof typeof PLANS;
      const plan = PLANS[planId] ?? PLANS.starter;
      const siteLimit = plan.limits.sites;

      const { count } = await supabase.from("client_sites").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      if ((count ?? 0) >= siteLimit) {
        toast.error(`Limite de ${siteLimit >= 999 ? "sites" : siteLimit + " site" + (siteLimit > 1 ? "s" : "")} atingido no plano ${plan.name}. Faça upgrade para adicionar mais.`);
        setSaving(false);
        return;
      }

      const { data: site, error } = await supabase.from("client_sites").insert({
        user_id: user.id,
        url: siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`,
        niche_primary: selectedNiches[0] || (showCustom ? customNiche : null),
        niche_secondary: selectedNiches[1] || null,
        da_current: da,
        da_history: da > 0 ? [{ date: new Date().toISOString().split("T")[0], value: da }] : [],
        seo_score: 0, phase: "planting", autopilot_active: true,
      }).select().single();

      if (error) { toast.error(error.message); setSaving(false); return; }

      const selected = keywordsToMonitor.filter(k => k.checked);
      const newKws = parseNewKeywords();
      const allKws = [
        ...selected.map(k => ({ client_site_id: site.id, keyword: k.keyword, search_volume: k.volume, difficulty: k.difficulty, position_current: k.position })),
        ...newKws.map(kw => ({ client_site_id: site.id, keyword: kw, search_volume: 0, difficulty: 0, position_current: null })),
      ];
      if (allKws.length > 0) await supabase.from("keywords").insert(allKws);
      if (competitors.length > 0) { try { await supabase.from("competitors").insert(competitors.map(c => ({ client_site_id: site.id, domain: c.domain, da: 0, detected_automatically: true }))); } catch {} }

      toast.success("Site adicionado!");
      router.push(`/integrations/setup`);
    } catch (e) {
      console.error("[sites/new] save failed:", e);
      toast.error("Não conseguimos cadastrar seu site. Tente novamente em alguns instantes.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < step ? 'bg-primary text-primary-foreground' : i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 'bg-muted text-muted-foreground'}`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-10 h-0.5 rounded ${i < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: URL */}
          {currentStep === "url" && (
            <motion.div key="url" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">Adicionar novo site</h1>
                <p className="text-muted-foreground">Cole a URL do site que quer adicionar ao piloto automático.</p>
              </div>
              <div className="card-beam rounded-2xl border bg-card p-8 relative overflow-hidden">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL do site</Label>
                    <Input placeholder="https://meusite.com.br" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} className="h-12 text-base" onKeyDown={(e) => e.key === "Enter" && siteUrl.trim() && (setStep(1), startAnalysis())} />
                  </div>
                  <Button size="xl" className="w-full" disabled={!siteUrl.trim()} onClick={() => { setStep(1); startAnalysis(); }}>
                    Analisar site <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="text-center mt-4">
                <Button variant="ghost" onClick={() => router.push("/sites")} className="text-muted-foreground">Cancelar</Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Analysis */}
          {currentStep === "analysis" && (
            <motion.div key="analysis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">{analyzing ? "Analisando..." : "Análise completa!"}</h1>
                <p className="text-muted-foreground font-mono text-sm">{siteUrl}</p>
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
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4 pt-4 border-t border-border mt-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-muted/30 rounded-xl p-3 text-center"><p className="text-[10px] text-muted-foreground font-mono uppercase mb-1">Autoridade</p><p className="text-base font-bold"><NumberTicker value={da} /></p></div>
                      <div className="bg-muted/30 rounded-xl p-3 text-center"><p className="text-[10px] text-muted-foreground font-mono uppercase mb-1">Backlinks</p><p className="text-base font-bold"><NumberTicker value={backlinks} /></p></div>
                      <div className="bg-muted/30 rounded-xl p-3 text-center"><p className="text-[10px] text-muted-foreground font-mono uppercase mb-1">Ref. Domains</p><p className="text-base font-bold"><NumberTicker value={referringDomains} /></p></div>
                    </div>
                    {topKeywords.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-2 flex items-center gap-2"><Search className="w-3.5 h-3.5 text-primary" /> Top keywords posicionadas</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {topKeywords.map((kw, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-bold w-6 text-center ${(kw.position ?? 100) <= 10 ? 'text-success' : 'text-muted-foreground'}`}>#{kw.position}</span>
                                <span>{kw.keyword}</span>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">{kw.volume.toLocaleString()}/mês</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <Button size="lg" className="w-full" onClick={() => setStep(2)}>Definir nicho <ArrowRight className="w-4 h-4" /></Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Niche */}
          {currentStep === "niche" && (
            <motion.div key="niche" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">Sobre o que é esse site?</h1>
                <p className="text-muted-foreground">Selecione 1 a 3 nichos.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-4">
                {suggestedNiches.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider font-mono mb-3 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Sugerido</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedNiches.map((n) => (
                        <button key={n} onClick={() => toggleNiche(n)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all ${selectedNiches.includes(n) ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : 'bg-primary-light text-primary'}`}>
                          {selectedNiches.includes(n) && <Check className="w-3.5 h-3.5 inline mr-1.5" />}{n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3">Todos os nichos</p>
                  <div className="flex flex-wrap gap-2">
                    {NICHE_OPTIONS.filter(n => !suggestedNiches.includes(n)).map((n) => (
                      <button key={n} onClick={() => toggleNiche(n)} className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${selectedNiches.includes(n) ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                        {selectedNiches.includes(n) && <Check className="w-3 h-3 inline mr-1" />}{n}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setShowCustom(!showCustom)} className="text-xs text-primary hover:underline cursor-pointer">{showCustom ? "Fechar" : "Não encontrou? Digite"}</button>
                {showCustom && <Input placeholder="Ex: Equinos, Energia Solar..." value={customNiche} onChange={(e) => setCustomNiche(e.target.value)} />}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /> Voltar</Button>
                  <Button onClick={() => setStep(3)} disabled={selectedNiches.length === 0 && !customNiche.trim()}>Continuar <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Keywords */}
          {currentStep === "keywords" && (
            <motion.div key="keywords" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">Keywords para monitorar</h1>
                <p className="text-muted-foreground">Selecione e adicione as palavras que quer posicionar.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-4">
                {keywordsToMonitor.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-success uppercase tracking-wider font-mono mb-2 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Já posiciona</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {keywordsToMonitor.map((kw, i) => (
                        <div key={i} onClick={() => setKeywordsToMonitor(prev => prev.map((k, j) => j === i ? { ...k, checked: !k.checked } : k))}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${kw.checked ? 'bg-success-light ring-1 ring-success/20' : 'hover:bg-muted/50'}`}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${kw.checked ? 'bg-success border-success' : 'border-border-strong'}`}>
                            {kw.checked && <Check className="w-2.5 h-2.5 text-success-foreground" />}
                          </div>
                          <span className="text-sm flex-1">{kw.keyword}</span>
                          {kw.position && <span className="text-[10px] font-mono text-success">#{kw.position}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider font-mono mb-2 flex items-center gap-2"><Target className="w-3.5 h-3.5" /> Quer conquistar</p>
                  <textarea className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none input-glow resize-y"
                    placeholder="Ex: melhor notebook 2026&#10;como escolher notebook" value={newKeywordsText} onChange={(e) => setNewKeywordsText(e.target.value)} />
                  {parseNewKeywords().length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">{parseNewKeywords().map((kw, i) => <Badge key={i} variant="outline" className="text-xs bg-primary-light text-primary border-primary/20">+ {kw}</Badge>)}</div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4" /> Voltar</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <>Salvar e conectar integrações <ArrowRight className="w-4 h-4" /></>}
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
