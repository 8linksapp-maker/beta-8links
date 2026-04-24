"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Check, ArrowRight, ArrowLeft, Loader2, Sparkles,
  Globe, Search, FileText, GitBranch, Plug, X, ExternalLink,
  ChevronRight, Zap, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

const STEPS = ["google", "wordpress", "github", "done"];

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [siteId, setSiteId] = useState<string>("");
  const [siteUrl, setSiteUrl] = useState<string>("");

  // Google state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleGSC, setGoogleGSC] = useState<string | null>(null);
  const [googleGA, setGoogleGA] = useState<string | null>(null);
  const [googleProperties, setGoogleProperties] = useState<Array<{ id: string; displayName: string }>>([]);
  const [gscSites, setGscSites] = useState<Array<{ siteUrl: string }>>([]);
  const [selectedGA, setSelectedGA] = useState("");
  const [selectedGSC, setSelectedGSC] = useState("");
  const [loadingGoogleProps, setLoadingGoogleProps] = useState(false);
  const [googlePropsSaved, setGooglePropsSaved] = useState(false);
  const [pendingGoogleLoad, setPendingGoogleLoad] = useState(false);

  // WordPress state
  const [wpConnected, setWpConnected] = useState(false);
  const [wpUrl, setWpUrl] = useState("");
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [wpTesting, setWpTesting] = useState(false);
  const [wpSaving, setWpSaving] = useState(false);
  const [wpTestResult, setWpTestResult] = useState<any>(null);

  // GitHub state
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUser, setGithubUser] = useState<string | null>(null);
  const [githubRepos, setGithubRepos] = useState<Array<{ fullName: string; name: string }>>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSaved, setRepoSaved] = useState(false);

  const currentStep = STEPS[step];

  // Load site data
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("client_sites").select("id, url, ga_property_id, gsc_site_url, google_refresh_token, wp_url, github_username").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      if (data?.[0]) {
        setSiteId(data[0].id);
        setSiteUrl(data[0].url);
        if (data[0].google_refresh_token) {
          setGoogleConnected(true);
          setGoogleGSC(data[0].gsc_site_url);
          setGoogleGA(data[0].ga_property_id);
          setGooglePropsSaved(!!data[0].gsc_site_url || !!data[0].ga_property_id);
          // Skip Google step if already connected — but not if returning from OAuth
          const hasOAuthReturn = new URLSearchParams(window.location.search).get("success");
          if ((data[0].gsc_site_url || data[0].ga_property_id) && !hasOAuthReturn) {
            setStep(1); // Go straight to WordPress
          }
        }
        if (data[0].wp_url) setWpConnected(true);
        if (data[0].github_username) {
          setGithubConnected(true);
          setGithubUser(data[0].github_username);
        }
      }
    }
    load();
  }, []);

  // Check if returning from OAuth
  const [pendingGithubLoad, setPendingGithubLoad] = useState(false);

  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "google_connected") {
      setGoogleConnected(true);
      toast.success("Google conectado! Escolha suas propriedades.");
      setStep(0);
      setPendingGoogleLoad(true);
    } else if (success === "github_connected") {
      setGithubConnected(true);
      toast.success("GitHub conectado! Agora escolha o repositório.");
      setStep(2);
      setPendingGithubLoad(true);
    }
  }, [searchParams]);

  // Load Google properties when siteId is ready
  useEffect(() => {
    if (pendingGoogleLoad && siteId) {
      setPendingGoogleLoad(false);
      loadGoogleProperties();
    }
  }, [pendingGoogleLoad, siteId]);

  // Load repos when siteId is ready and GitHub just connected
  useEffect(() => {
    if (pendingGithubLoad && siteId) {
      setPendingGithubLoad(false);
      loadGithubRepos();
    }
  }, [pendingGithubLoad, siteId]);

  const loadGoogleProperties = async () => {
    if (!siteId) return;
    setLoadingGoogleProps(true);
    try {
      const res = await fetch(`/api/integrations/google-properties?siteId=${siteId}`);
      const data = await res.json();
      if (data.gaProperties) setGoogleProperties(data.gaProperties);
      if (data.gscSites) setGscSites(data.gscSites);
    } catch { /* ok */ }
    setLoadingGoogleProps(false);
  };

  const saveGoogleProperties = async () => {
    if (!siteId) return;
    try {
      await fetch("/api/integrations/google-properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, gaPropertyId: selectedGA || null, gscSiteUrl: selectedGSC || null }),
      });
      setGoogleGA(selectedGA);
      setGoogleGSC(selectedGSC);
      setGooglePropsSaved(true);
      toast.success("Propriedades Google salvas!");
      setTimeout(() => setStep(1), 1000);
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const loadGithubRepos = async () => {
    if (!siteId) return;
    setLoadingRepos(true);
    try {
      const res = await fetch(`/api/integrations/github-repos?siteId=${siteId}`);
      const data = await res.json();
      if (data.repos) setGithubRepos(data.repos);
    } catch { /* ok */ }
    setLoadingRepos(false);
  };

  const saveGithubRepo = async () => {
    if (!selectedRepo || !siteId) return;
    const supabase = createClient();
    await supabase.from("client_sites").update({ github_repo: selectedRepo }).eq("id", siteId);
    setRepoSaved(true);
    toast.success(`Repositório ${selectedRepo} salvo!`);
    setTimeout(() => setStep(3), 1000);
  };

  const testWordPress = async () => {
    setWpTesting(true);
    setWpTestResult(null);
    try {
      const res = await fetch("/api/integrations/test-wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wpUrl, wpUsername: wpUser, wpAppPassword: wpPass }),
      });
      setWpTestResult(await res.json());
    } catch {
      setWpTestResult({ error: "Erro de conexão" });
    }
    setWpTesting(false);
  };

  const saveWordPress = async () => {
    if (!siteId) return;
    setWpSaving(true);
    try {
      const res = await fetch("/api/integrations/save-wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, wpUrl, wpUsername: wpUser, wpAppPassword: wpPass }),
      });
      const data = await res.json();
      if (data.success) {
        setWpConnected(true);
        toast.success("WordPress conectado!");
        setTimeout(() => setStep(2), 1000); // Advance to GitHub
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Erro ao salvar");
    }
    setWpSaving(false);
  };

  const connectedCount = [googleConnected, wpConnected, githubConnected].filter(Boolean).length;

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-xl">

        {/* Progress */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {["Google", "WordPress", "GitHub", "Pronto"].map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i < step ? 'bg-success text-success-foreground' :
                  i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> :
                   i === 0 ? <BarChart3 className="w-4 h-4" /> :
                   i === 1 ? <FileText className="w-4 h-4" /> :
                   i === 2 ? <GitBranch className="w-4 h-4" /> :
                   <Sparkles className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] font-mono ${i === step ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 rounded mb-4 transition-colors ${i < step ? 'bg-success' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ══ STEP 1: GOOGLE ══ */}
          {currentStep === "google" && (
            <motion.div key="google" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-[#4285F4]/10 to-[#34A853]/10 p-6 border-b border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                      <BarChart3 className="w-7 h-7 text-[#4285F4]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold font-[family-name:var(--font-display)]">Google Analytics + Search Console</h2>
                      <p className="text-sm text-muted-foreground">Veja tráfego real e posições no Google</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 space-y-5">
                  {googleConnected && googlePropsSaved ? (
                    /* Fully configured */
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-success" />
                      </div>
                      <h3 className="text-base font-bold mb-1">Google configurado!</h3>
                      {googleGSC && <p className="text-xs text-muted-foreground font-mono">Search Console: {googleGSC}</p>}
                      {googleGA && <p className="text-xs text-muted-foreground font-mono">Analytics: {googleGA}</p>}
                    </motion.div>
                  ) : googleConnected ? (
                    /* Connected, pick properties */
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center"><Check className="w-4 h-4 text-success" /></div>
                        <div>
                          <p className="text-sm font-bold">Google conectado!</p>
                          <p className="text-xs text-muted-foreground">Escolha quais propriedades conectar:</p>
                        </div>
                      </div>

                      {loadingGoogleProps ? (
                        <div className="flex items-center gap-2 py-4 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> <span className="text-sm text-muted-foreground">Carregando propriedades...</span></div>
                      ) : (
                        <>
                          {/* Search Console sites */}
                          {gscSites.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2">Search Console</p>
                              <div className="space-y-2 max-h-36 overflow-y-auto">
                                {gscSites.map((site) => (
                                  <div key={site.siteUrl} onClick={() => setSelectedGSC(site.siteUrl)}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedGSC === site.siteUrl ? 'bg-primary-light ring-1 ring-primary/20' : 'bg-muted/30 hover:bg-muted/50'}`}>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedGSC === site.siteUrl ? 'bg-primary border-primary' : 'border-border-strong'}`}>
                                      {selectedGSC === site.siteUrl && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                                    </div>
                                    <span className="text-sm font-mono">{site.siteUrl}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* GA4 properties */}
                          {googleProperties.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2">Google Analytics</p>
                              <div className="space-y-2 max-h-36 overflow-y-auto">
                                {googleProperties.map((prop) => (
                                  <div key={prop.id} onClick={() => setSelectedGA(prop.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedGA === prop.id ? 'bg-primary-light ring-1 ring-primary/20' : 'bg-muted/30 hover:bg-muted/50'}`}>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedGA === prop.id ? 'bg-primary border-primary' : 'border-border-strong'}`}>
                                      {selectedGA === prop.id && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                                    </div>
                                    <span className="text-sm">{prop.displayName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {gscSites.length === 0 && googleProperties.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma propriedade encontrada nesta conta Google.</p>
                          )}

                          {(selectedGA || selectedGSC) && (
                            <Button className="w-full" onClick={saveGoogleProperties}>
                              Salvar e continuar <ArrowRight className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Search className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <p className="text-sm text-muted-foreground">Monitore suas <span className="text-foreground font-semibold">posições reais</span> no Google — keywords, cliques, impressões</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <Globe className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <p className="text-sm text-muted-foreground">Veja o <span className="text-foreground font-semibold">tráfego real</span> do seu site — sessões, pageviews, origem</p>
                        </div>
                      </div>
                      <Button className="w-full" size="lg" onClick={() => {
                        window.location.href = `/api/auth/google?siteId=${siteId}&redirect=/integrations/setup`;
                      }}>
                        <BarChart3 className="w-4 h-4" /> Conectar Google
                      </Button>
                    </>
                  )}

                  <div className="flex items-center justify-end pt-4 border-t border-border">
                    <Button variant={googleConnected ? "default" : "ghost"} onClick={() => setStep(1)} className={googleConnected ? "" : "text-muted-foreground"}>
                      {googleConnected ? "Próximo" : "Pular esta etapa"} <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ══ STEP 2: WORDPRESS ══ */}
          {currentStep === "wordpress" && (
            <motion.div key="wordpress" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-[#21759B]/10 to-[#21759B]/5 p-6 border-b border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#21759B]/20 flex items-center justify-center">
                      <FileText className="w-7 h-7 text-[#21759B]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold font-[family-name:var(--font-display)]">WordPress</h2>
                      <p className="text-sm text-muted-foreground">Publique artigos gerados pela IA direto no seu blog</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 space-y-5">
                  {wpConnected ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-success" />
                      </div>
                      <h3 className="text-base font-bold mb-1">WordPress conectado!</h3>
                      <p className="text-xs text-muted-foreground font-mono">{wpUrl}</p>
                    </motion.div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Pra conectar, você precisa de uma <span className="text-foreground font-semibold">Application Password</span> do WordPress.
                        Vá em WordPress → Usuários → Seu perfil → Application Passwords.
                      </p>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">URL do WordPress</Label>
                          <Input placeholder="https://meusite.com.br" value={wpUrl} onChange={(e) => setWpUrl(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Usuário</Label>
                          <Input placeholder="admin" value={wpUser} onChange={(e) => setWpUser(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Application Password</Label>
                          <Input placeholder="xxxx xxxx xxxx xxxx" value={wpPass} onChange={(e) => setWpPass(e.target.value)} type="password" />
                        </div>
                      </div>

                      {wpTestResult && (
                        <div className={`p-3 rounded-lg text-sm ${wpTestResult.success ? 'bg-success-light text-success' : 'bg-[hsl(0_80%_60%/0.1)] text-destructive'}`}>
                          {wpTestResult.success ? `✅ ${wpTestResult.message}` : `❌ ${wpTestResult.error}`}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" disabled={wpTesting || !wpUrl || !wpUser || !wpPass} onClick={testWordPress}>
                          {wpTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Testar Conexão"}
                        </Button>
                        <Button className="flex-1" disabled={!wpTestResult?.success || wpSaving} onClick={saveWordPress}>
                          {wpSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar e Continuar"}
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4" /> Voltar</Button>
                    <Button variant="ghost" onClick={() => setStep(2)} className="text-muted-foreground">
                      {wpConnected ? <> Próximo <ArrowRight className="w-4 h-4" /></> : "Não uso WordPress — Pular"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ══ STEP 3: GITHUB ══ */}
          {currentStep === "github" && (
            <motion.div key="github" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-[#333]/30 to-[#333]/10 p-6 border-b border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                      <GitBranch className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold font-[family-name:var(--font-display)]">GitHub</h2>
                      <p className="text-sm text-muted-foreground">Para sites em Astro, Next.js, Hugo e outros</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 space-y-5">
                  {githubConnected && repoSaved ? (
                    /* Connected + repo selected */
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-success" />
                      </div>
                      <h3 className="text-base font-bold mb-1">GitHub configurado!</h3>
                      {githubUser && <p className="text-xs text-muted-foreground font-mono mb-1">@{githubUser}</p>}
                      <p className="text-xs text-muted-foreground font-mono">{selectedRepo}</p>
                    </motion.div>
                  ) : githubConnected ? (
                    /* Connected, pick repo */
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center"><Check className="w-4 h-4 text-success" /></div>
                        <div>
                          <p className="text-sm font-bold">GitHub conectado! {githubUser && <span className="text-muted-foreground font-normal">@{githubUser}</span>}</p>
                          <p className="text-xs text-muted-foreground">Agora escolha o repositório do seu site:</p>
                        </div>
                      </div>

                      {loadingRepos ? (
                        <div className="flex items-center gap-2 py-4 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> <span className="text-sm text-muted-foreground">Carregando repositórios...</span></div>
                      ) : githubRepos.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {githubRepos.map((repo) => (
                            <div
                              key={repo.fullName}
                              onClick={() => setSelectedRepo(repo.fullName)}
                              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                selectedRepo === repo.fullName ? 'bg-primary-light ring-1 ring-primary/20' : 'bg-muted/30 hover:bg-muted/50'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedRepo === repo.fullName ? 'bg-primary border-primary' : 'border-border-strong'}`}>
                                {selectedRepo === repo.fullName && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium font-mono">{repo.fullName}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">Nenhum repositório encontrado.</p>
                          <Button variant="outline" size="sm" className="mt-2" onClick={loadGithubRepos}>Tentar novamente</Button>
                        </div>
                      )}

                      {selectedRepo && (
                        <Button className="w-full" onClick={saveGithubRepo}>
                          Salvar repositório <ArrowRight className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    /* Not connected */
                    <>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Se seu site é feito em <span className="text-foreground font-semibold">Astro, Next.js, Hugo ou qualquer framework estático</span>,
                          conecte o GitHub para publicar artigos direto no repositório.
                        </p>
                        <div className="flex items-start gap-3">
                          <GitBranch className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <p className="text-sm text-muted-foreground">O 8links cria o arquivo <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">.md</code> no repo → commit automático → site rebuilda</p>
                        </div>
                      </div>
                      <Button className="w-full" size="lg" onClick={() => {
                        window.location.href = `/api/auth/github?siteId=${siteId}&redirect=/integrations/setup`;
                      }}>
                        <GitBranch className="w-4 h-4" /> Conectar GitHub
                      </Button>
                    </>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /> Voltar</Button>
                    <Button variant="ghost" onClick={() => setStep(3)} className="text-muted-foreground">
                      {githubConnected && repoSaved ? <>Próximo <ArrowRight className="w-4 h-4" /></> : "Não uso GitHub — Pular"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ══ STEP 4: DONE ══ */}
          {currentStep === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }}>
              <div className="text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", damping: 15 }}
                  className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-[hsl(35,100%,60%)] flex items-center justify-center mx-auto mb-6 shadow-[0_0_48px_hsl(24_100%_55%/0.3)]">
                  <Zap className="w-9 h-9 text-white" />
                </motion.div>

                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-3">
                  Tudo <span className="text-gradient">configurado!</span>
                </h1>
                <p className="text-muted-foreground mb-6">
                  {connectedCount === 0 && "Nenhuma integração conectada — você pode configurar depois."}
                  {connectedCount === 1 && "1 integração conectada."}
                  {connectedCount === 2 && "2 integrações conectadas."}
                  {connectedCount === 3 && "Todas as integrações conectadas! 🎉"}
                  {" "}Você pode alterar a qualquer momento em Configurações → Integrações.
                </p>

                {/* Summary */}
                <Card className="mb-6 text-left">
                  <CardContent className="p-5 space-y-3">
                    {[
                      { name: "Google Analytics + Search Console", connected: googleConnected, icon: BarChart3 },
                      { name: "WordPress", connected: wpConnected, icon: FileText },
                      { name: "GitHub", connected: githubConnected, icon: GitBranch },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        {item.connected ? (
                          <Badge variant="success" className="text-[10px]"><Check className="w-2.5 h-2.5 mr-0.5" /> Conectado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Não conectado</Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <button onClick={() => router.push("/dashboard")}
                  className="btn-glow rounded-xl px-10 py-4 text-base font-bold inline-flex items-center gap-2 cursor-pointer">
                  <Sparkles className="w-5 h-5" /> Ir para o Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function IntegrationsSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <SetupContent />
    </Suspense>
  );
}
