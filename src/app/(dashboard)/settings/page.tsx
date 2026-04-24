"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import {
  User, CreditCard, Plug, Bell, Palette, Shield,
  Save, ExternalLink, Check, ChevronRight,
  Link as LinkIcon, Globe, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { NumberTicker } from "@/components/ui/number-ticker";

const tabs = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "billing", label: "Cobrança", icon: CreditCard },
  { id: "integrations", label: "Integrações", icon: Plug },
  { id: "brand", label: "Voz da Marca", icon: Palette },
  { id: "notifications", label: "Notificações", icon: Bell },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [notifications, setNotifications] = useState({ email: true, whatsapp: true, rankDrop: true, weeklyReport: true, achievements: true, competitors: false });
  const { profile } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setEmail(profile.email ?? "");
    }
  }, [profile]);

  // Site data for integrations
  const [siteData, setSiteData] = useState<any>(null);

  // WordPress state
  const [wpDialogOpen, setWpDialogOpen] = useState(false);
  const [wpUrl, setWpUrl] = useState("");
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [wpTesting, setWpTesting] = useState(false);
  const [wpSaving, setWpSaving] = useState(false);
  const [wpTestResult, setWpTestResult] = useState<any>(null);

  // Load site data for integrations tab
  useEffect(() => {
    async function loadSite() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("client_sites").select("id, url, ga_property_id, gsc_site_url, google_refresh_token, wp_url, wp_username, github_username, github_repo").eq("user_id", user.id).limit(1);
      if (data?.[0]) setSiteData(data[0]);
    }
    loadSite();
  }, []);

  const testWordPress = async () => {
    setWpTesting(true);
    setWpTestResult(null);
    try {
      const res = await fetch("/api/integrations/test-wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wpUrl, wpUsername: wpUser, wpAppPassword: wpPass }),
      });
      const data = await res.json();
      setWpTestResult(data);
    } catch {
      setWpTestResult({ error: "Erro de conexão" });
    }
    setWpTesting(false);
  };

  const saveWordPress = async () => {
    if (!siteData?.id) { toast.error("Nenhum site cadastrado"); return; }
    setWpSaving(true);
    try {
      const res = await fetch("/api/integrations/save-wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: siteData.id, wpUrl, wpUsername: wpUser, wpAppPassword: wpPass }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("WordPress conectado!");
        setSiteData((prev: any) => ({ ...prev, wp_url: wpUrl, wp_username: wpUser }));
        setWpDialogOpen(false);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Erro ao salvar");
    }
    setWpSaving(false);
  };

  const saveProfile = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ name }).eq("id", user.id);
    toast.success("Perfil atualizado!");
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="page-title">Configurações</h1>
        <p className="page-description">Perfil, integrações, pagamento e notificações</p>
      </motion.div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="w-56 shrink-0 hidden lg:block">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                  activeTab === tab.id
                    ? "bg-primary-light text-primary ring-1 ring-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </motion.div>

        {/* Content */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex-1 min-w-0">
          {/* Mobile tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto lg:hidden pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-all ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profile */}
          {activeTab === "profile" && (
            <Card>
              <CardHeader><CardTitle>Perfil</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input value={email} disabled type="email" /></div>
                </div>
                <Separator />
                <div className="space-y-2"><Label>Senha atual</Label><Input type="password" placeholder="••••••••" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2"><Label>Nova senha</Label><Input type="password" placeholder="Mínimo 8 caracteres" /></div>
                  <div className="space-y-2"><Label>Confirmar senha</Label><Input type="password" placeholder="Repetir senha" /></div>
                </div>
                <div className="flex justify-end"><Button onClick={saveProfile}><Save className="w-4 h-4" /> Salvar</Button></div>
              </CardContent>
            </Card>
          )}

          {/* Billing */}
          {activeTab === "billing" && (
            <div className="space-y-4">
              <Card className="card-beam relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Plano atual</p>
                      <p className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mt-1">
                        {profile?.plan_id === "agency" ? "Agência" : profile?.plan_id === "pro" ? "Pro" : "Starter"}
                        <Badge variant="success" className="ml-2">{profile?.subscription_status === "active" ? "Ativo" : profile?.subscription_status === "trialing" ? "Trial" : "Inativo"}</Badge>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black font-[family-name:var(--font-display)]">R$ {profile?.plan_id === "agency" ? 597 : profile?.plan_id === "pro" ? 297 : 147}<span className="text-sm text-muted-foreground font-normal">/mês</span></p>
                    </div>
                  </div>
                  <Separator />
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2"><span>Créditos IA</span><span className="font-mono font-semibold"><NumberTicker value={profile?.credits_balance ?? 0} /> / {profile?.plan_id === "agency" ? 2000 : profile?.plan_id === "pro" ? 500 : 100}</span></div>
                    <Progress value={((profile?.credits_balance ?? 0) / (profile?.plan_id === "agency" ? 2000 : profile?.plan_id === "pro" ? 500 : 100)) * 100} />
                    <p className="text-xs text-muted-foreground mt-2">Renovam em 18 dias • <button className="text-primary hover:underline cursor-pointer">Comprar créditos extras</button></p>
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="card-interactive cursor-pointer" onClick={() => toast("Em breve!")}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div><p className="text-sm font-semibold">Método de pagamento</p><p className="text-xs text-muted-foreground">Visa •••• 4242</p></div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </CardContent>
                </Card>
                <Card className="card-interactive cursor-pointer" onClick={() => toast("Em breve!")}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <Zap className="w-5 h-5 text-primary" />
                    <div><p className="text-sm font-semibold">Fazer upgrade</p><p className="text-xs text-muted-foreground">Mudar para Agência (R$597/mês)</p></div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Integrations */}
          {activeTab === "integrations" && (
            <div className="space-y-4">
              {/* Google Analytics + Search Console (same OAuth) */}
              <Card className="card-interactive">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">📊</span>
                      <div>
                        <p className="text-sm font-semibold flex items-center gap-2">
                          Google Analytics + Search Console
                          {(siteData?.ga_property_id || siteData?.gsc_site_url || siteData?.google_refresh_token) && <Check className="w-3.5 h-3.5 text-success" />}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(siteData?.ga_property_id || siteData?.gsc_site_url || siteData?.google_refresh_token)
                            ? `${siteData.ga_property_id ? `GA: Conectado` : "GA: não detectado"} • ${siteData.gsc_site_url ? `GSC: ${siteData.gsc_site_url}` : "GSC: não detectado"}`
                            : "Conecte para ver tráfego real e posições no Google"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={(siteData?.ga_property_id || siteData?.gsc_site_url || siteData?.google_refresh_token) ? "outline" : "default"}
                      size="sm"
                      onClick={() => {
                        const siteId = siteData?.id ?? "";
                        window.location.href = `/api/auth/google?siteId=${siteId}`;
                      }}
                    >
                      {(siteData?.ga_property_id || siteData?.gsc_site_url || siteData?.google_refresh_token) ? "Reconectar" : <><Plug className="w-3.5 h-3.5" /> Conectar Google</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* WordPress */}
              <Card className="card-interactive">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">📝</span>
                      <div>
                        <p className="text-sm font-semibold flex items-center gap-2">
                          WordPress
                          {siteData?.wp_url && <Check className="w-3.5 h-3.5 text-success" />}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {siteData?.wp_url ? `Conectado: ${siteData.wp_url}` : "Publique artigos direto do 8links"}
                        </p>
                      </div>
                    </div>
                    <Button variant={siteData?.wp_url ? "outline" : "default"} size="sm" onClick={() => setWpDialogOpen(true)}>
                      {siteData?.wp_url ? "Reconfigurar" : <><Plug className="w-3.5 h-3.5" /> Conectar</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* GitHub */}
              <Card className="card-interactive">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">🐙</span>
                      <div>
                        <p className="text-sm font-semibold flex items-center gap-2">
                          GitHub (Astro, Next.js, Hugo...)
                          {siteData?.github_username && <Check className="w-3.5 h-3.5 text-success" />}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {siteData?.github_username
                            ? `@${siteData.github_username}${siteData.github_repo ? ` · ${siteData.github_repo}` : ""}`
                            : "Publique artigos via GitHub para sites estáticos (Astro, Hugo, Next.js)"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={siteData?.github_username ? "outline" : "default"}
                      size="sm"
                      onClick={() => {
                        const siteId = siteData?.id ?? "";
                        window.location.href = `/api/auth/github?siteId=${siteId}`;
                      }}
                    >
                      {siteData?.github_username ? "Reconectar" : <><Plug className="w-3.5 h-3.5" /> Conectar GitHub</>}
                    </Button>
                  </div>
                  {siteData?.github_username && !siteData?.github_repo && (
                    <div className="mt-3 p-3 rounded-lg bg-warning-light border border-warning/20">
                      <p className="text-xs text-warning">Selecione o repositório do seu site nas configurações do site.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* WP Dialog */}
              <Dialog open={wpDialogOpen} onOpenChange={setWpDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Conectar WordPress</DialogTitle>
                    <DialogDescription>
                      Use uma Application Password do WordPress. Vá em WordPress → Usuários → Seu perfil → Application Passwords.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>URL do WordPress</Label>
                      <Input placeholder="https://meusite.com.br" value={wpUrl} onChange={(e) => setWpUrl(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Usuário</Label>
                      <Input placeholder="admin" value={wpUser} onChange={(e) => setWpUser(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Application Password</Label>
                      <Input placeholder="xxxx xxxx xxxx xxxx" value={wpPass} onChange={(e) => setWpPass(e.target.value)} type="password" />
                    </div>
                    {wpTestResult && (
                      <div className={`p-3 rounded-lg text-sm ${wpTestResult.success ? 'bg-success-light text-success' : 'bg-[hsl(0_80%_60%/0.1)] text-destructive'}`}>
                        {wpTestResult.message ?? wpTestResult.error}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setWpDialogOpen(false)}>Cancelar</Button>
                    <Button variant="outline" disabled={wpTesting || !wpUrl || !wpUser || !wpPass} onClick={testWordPress}>
                      {wpTesting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testando...</> : "Testar Conexão"}
                    </Button>
                    <Button disabled={!wpTestResult?.success || wpSaving} onClick={saveWordPress}>
                      {wpSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</> : "Salvar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Brand Voice */}
          {activeTab === "brand" && (
            <Card>
              <CardHeader><CardTitle>Voz da Marca</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-muted-foreground">A IA vai usar essas informações em todos os artigos gerados para seu site.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2"><Label>Nome do site</Label><Input defaultValue="TechReviews Brasil" /></div>
                  <div className="space-y-2">
                    <Label>Tom de voz</Label>
                    <select className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm input-glow cursor-pointer">
                      <option>Informal e acessível</option>
                      <option>Formal e profissional</option>
                      <option>Técnico e detalhado</option>
                      <option>Descontraído e divertido</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Público-alvo</Label><Input defaultValue="Entusiastas de tecnologia, gamers, profissionais" /></div>
                <div className="space-y-2"><Label>Sobre o site</Label><Textarea defaultValue="Somos referência em reviews de notebooks e gadgets no Brasil desde 2022." rows={3} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2"><Label>Palavras-chave da marca</Label><Input defaultValue="notebook, gamer, tecnologia, review" /><p className="text-xs text-muted-foreground">Separadas por vírgula</p></div>
                  <div className="space-y-2"><Label>Palavras proibidas</Label><Input defaultValue="barato, grátis, promoção" /><p className="text-xs text-muted-foreground">A IA nunca usará essas palavras</p></div>
                </div>
                <div className="flex justify-end"><Button onClick={() => toast.success("Voz da marca atualizada!")}><Save className="w-4 h-4" /> Salvar</Button></div>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader><CardTitle>Notificações</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {[
                  { key: "email" as const, label: "Relatórios por email", desc: "Receba resumos semanais e mensais" },
                  { key: "whatsapp" as const, label: "Alertas WhatsApp", desc: "Notificações importantes via WhatsApp" },
                  { key: "rankDrop" as const, label: "Alerta de queda", desc: "Avise quando uma keyword cair de posição" },
                  { key: "weeklyReport" as const, label: "Relatório semanal", desc: "Resumo automático toda segunda-feira" },
                  { key: "achievements" as const, label: "Conquistas", desc: "Notificar quando desbloquear uma conquista" },
                  { key: "competitors" as const, label: "Atividade de concorrentes", desc: "Avisar quando um concorrente publicar conteúdo" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                    <Switch checked={notifications[item.key]} onCheckedChange={(v) => { setNotifications(n => ({ ...n, [item.key]: v })); toast(v ? `${item.label} ativado` : `${item.label} desativado`); }} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
