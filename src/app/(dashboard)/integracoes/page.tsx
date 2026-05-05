"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Plug, Plug2, Check, X, Loader2, ExternalLink,
  LayoutGrid, List, ChevronRight, Sparkles, Globe2, GitBranch,
  Trash2, RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { PageMetrics } from "@/components/ui/page-metrics";
import { useSite } from "@/lib/hooks/use-site";

type ViewMode = "cards" | "list";
type IntegrationKey = "google" | "wordpress" | "github";

type Integration = {
  key: IntegrationKey;
  name: string;
  description: string;
  whatItDoes: string; // for layperson
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
};

const INTEGRATIONS: Integration[] = [
  {
    key: "google",
    name: "Google Search Console",
    description: "Veja quanta gente chega no seu site pelo Google",
    whatItDoes: "Mostra cliques, impressões, posição média e quais palavras tão te trazendo tráfego.",
    icon: Globe2,
    iconBg: "bg-info-light text-info",
  },
  {
    key: "wordpress",
    name: "WordPress",
    description: "Publique artigos direto no seu site",
    whatItDoes: "Conecta com seu WordPress pra publicar artigos com 1 clique, sem copiar e colar.",
    icon: Sparkles,
    iconBg: "bg-success-light text-success",
  },
  {
    key: "github",
    name: "GitHub",
    description: "Pra sites estáticos (Hugo, Astro, Next.js)",
    whatItDoes: "Faz commit do artigo direto no seu repositório. Avançado — só pra quem usa site estático.",
    icon: GitBranch,
    iconBg: "bg-muted text-muted-foreground",
  },
];

function isConnected(site: any, key: IntegrationKey): boolean {
  if (key === "google") return !!site.google_refresh_token;
  if (key === "wordpress") return !!site.wp_url;
  if (key === "github") return !!site.github_token;
  return false;
}

export default function IntegracoesPage() {
  const { sites, loading: sitesLoading, reload } = useSite();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [openIntegration, setOpenIntegration] = useState<IntegrationKey | null>(null);

  const totalSites = sites.length;

  const stats = useMemo(() => {
    let connectedPairs = 0;
    let withGoogle = 0;
    let withWp = 0;
    for (const s of sites) {
      if (isConnected(s, "google")) { connectedPairs++; withGoogle++; }
      if (isConnected(s, "wordpress")) { connectedPairs++; withWp++; }
      if (isConnected(s, "github")) { connectedPairs++; }
    }
    return { connectedPairs, withGoogle, withWp };
  }, [sites]);

  const connectedCount = (key: IntegrationKey) => sites.filter(s => isConnected(s, key)).length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl sm:text-4xl font-black font-[family-name:var(--font-display)] tracking-tight">Integrações</h1>
        <p className="text-base text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          Conecte seus sites com outras ferramentas pra automatizar tudo.
        </p>
      </motion.div>

      {/* KPIs */}
      <PageMetrics
        loading={sitesLoading}
        items={[
          {
            label: "Conexões ativas",
            value: stats.connectedPairs,
            icon: Plug,
            accent: true,
            hint: totalSites > 0 ? `de ${totalSites * INTEGRATIONS.length} possíveis` : undefined,
          },
          {
            label: "Sites com Google",
            value: stats.withGoogle,
            icon: Globe2,
            hint: totalSites > 0 ? `de ${totalSites} site${totalSites === 1 ? "" : "s"}` : undefined,
          },
          {
            label: "Sites com WordPress",
            value: stats.withWp,
            icon: Sparkles,
            hint: totalSites > 0 ? `de ${totalSites} site${totalSites === 1 ? "" : "s"}` : undefined,
          },
        ]}
      />

      {/* View toggle */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === "cards" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Ver como cards"
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Ver como lista"
          >
            <List className="w-3.5 h-3.5" /> Lista
          </button>
        </div>
      </div>

      {/* Integrations */}
      {totalSites === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Plug2 className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base text-muted-foreground mb-2">Nenhum site cadastrado ainda</p>
            <p className="text-sm text-muted-foreground">Cadastre um site primeiro pra poder conectá-lo a integrações.</p>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Integração</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">O que faz</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Conectada em</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {INTEGRATIONS.map((integration, idx) => {
                  const count = connectedCount(integration.key);
                  return (
                    <tr key={integration.key}
                      className={`border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${idx % 2 === 0 ? "" : "bg-muted/5"}`}
                      onClick={() => setOpenIntegration(integration.key)}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${integration.iconBg}`}>
                            <integration.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{integration.name}</p>
                            <p className="text-xs text-muted-foreground">{integration.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground max-w-md">
                        {integration.whatItDoes}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={count > 0 ? "success" : "outline"} className="text-xs">
                          {count} de {totalSites} site{totalSites === 1 ? "" : "s"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpenIntegration(integration.key)}>
                          Configurar <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INTEGRATIONS.map((integration, i) => {
            const count = connectedCount(integration.key);
            return (
              <motion.div
                key={integration.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <Card
                  className="card-interactive cursor-pointer group h-full"
                  onClick={() => setOpenIntegration(integration.key)}
                >
                  <CardContent className="p-5 sm:p-6 flex flex-col h-full">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${integration.iconBg}`}>
                      <integration.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">{integration.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-1">
                      {integration.whatItDoes}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={count > 0 ? "success" : "outline"} className="text-xs">
                        {count} de {totalSites}
                      </Badge>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        Configurar <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Per-integration dialogs */}
      {INTEGRATIONS.map((integration) => (
        <IntegrationDialog
          key={integration.key}
          integration={integration}
          open={openIntegration === integration.key}
          onClose={() => setOpenIntegration(null)}
          sites={sites}
          onUpdate={reload}
        />
      ))}
    </div>
  );
}

function IntegrationDialog({ integration, open, onClose, sites, onUpdate }: {
  integration: Integration;
  open: boolean;
  onClose: () => void;
  sites: any[];
  onUpdate: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${integration.iconBg}`}>
              <integration.icon className="w-5 h-5" />
            </div>
            {integration.name}
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            {integration.whatItDoes}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 py-2 max-h-[60vh] overflow-y-auto">
          {sites.map((site: any) => (
            <SiteIntegrationRow
              key={site.id}
              site={site}
              integration={integration}
              onUpdate={onUpdate}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SiteIntegrationRow({ site, integration, onUpdate }: {
  site: any;
  integration: Integration;
  onUpdate: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const connected = isConnected(site, integration.key);
  const cleanUrl = (site.url ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "");

  // What "Reconfigurar" does, per integration
  const reconfigure = () => {
    setChooserOpen(false);
    if (integration.key === "google") {
      window.location.href = `/api/auth/google?siteId=${site.id}&redirect=/integracoes`;
    } else if (integration.key === "github") {
      window.location.href = `/api/auth/github?siteId=${site.id}&redirect=/integracoes`;
    } else if (integration.key === "wordpress") {
      setExpanded(true);
    }
  };

  // Click handler for the row's main button
  const onActionClick = () => {
    if (connected) {
      setChooserOpen(true);
    } else {
      // Not connected: same as before — direct action
      if (integration.key === "google") {
        window.location.href = `/api/auth/google?siteId=${site.id}&redirect=/integracoes`;
      } else if (integration.key === "github") {
        window.location.href = `/api/auth/github?siteId=${site.id}&redirect=/integracoes`;
      } else if (integration.key === "wordpress") {
        setExpanded(true);
      }
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-3.5 hover:bg-muted/20">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{cleanUrl}</p>
          <p className="text-xs text-muted-foreground">
            {connected ? (
              <span className="text-success font-semibold inline-flex items-center gap-1">
                <Check className="w-3 h-3" /> Conectado
              </span>
            ) : (
              "Não conectado"
            )}
          </p>
        </div>

        <Button size="sm" variant={connected ? "outline" : "default"} className="gap-1.5"
          onClick={onActionClick}>
          <Plug className="w-3.5 h-3.5" />
          {connected
            ? (integration.key === "wordpress" ? "Gerenciar" : "Gerenciar")
            : "Conectar"}
        </Button>
      </div>

      {/* WordPress inline form (Reconfigurar mode) */}
      {expanded && integration.key === "wordpress" && (
        <WordPressForm
          site={site}
          onClose={() => setExpanded(false)}
          onUpdate={onUpdate}
        />
      )}

      {/* "Site conectado" chooser modal */}
      <ConnectedChooserDialog
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        site={site}
        integration={integration}
        onReconfigure={reconfigure}
        onUpdate={onUpdate}
      />
    </div>
  );
}

function ConnectedChooserDialog({ open, onClose, site, integration, onReconfigure, onUpdate }: {
  open: boolean;
  onClose: () => void;
  site: any;
  integration: Integration;
  onReconfigure: () => void;
  onUpdate: () => Promise<void>;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const cleanUrl = (site.url ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "");

  const reconfigureLabel =
    integration.key === "wordpress" ? "Editar credenciais" : "Reconectar";
  const reconfigureHint =
    integration.key === "google"
      ? "Refaz o login do Google e atualiza permissões."
      : integration.key === "wordpress"
        ? "Atualizar usuário ou senha de aplicativo."
        : "Refaz o login do GitHub e atualiza permissões.";

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const supabase = createClient();
      const update: Record<string, unknown> = {};
      if (integration.key === "google") {
        update.google_refresh_token = null;
        update.gsc_site_url = null;
        update.ga_property_id = null;
        update.gsc_clicks_28d = null;
        update.gsc_impressions_28d = null;
        update.gsc_avg_position = null;
        update.last_synced_at = null;
      } else if (integration.key === "wordpress") {
        update.wp_url = null;
        update.wp_username = null;
        update.wp_app_password = null;
      } else if (integration.key === "github") {
        update.github_token = null;
        update.github_username = null;
        update.github_repo = null;
      }
      const { error } = await supabase.from("client_sites").update(update).eq("id", site.id);
      if (error) {
        toast.error("Não conseguimos desconectar. Tente de novo.");
        return;
      }
      toast.success(`${integration.name} desconectado`);
      await onUpdate();
      onClose();
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${integration.iconBg}`}>
              <integration.icon className="w-5 h-5" />
            </div>
            Site conectado
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono text-foreground/80">{cleanUrl}</span> está conectado ao <strong className="text-foreground">{integration.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <motion.button
            type="button"
            onClick={onReconfigure}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center text-center gap-2 p-5 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-bold">{reconfigureLabel}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {reconfigureHint}
            </p>
          </motion.button>

          <motion.button
            type="button"
            onClick={disconnect}
            disabled={disconnecting}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center text-center gap-2 p-5 rounded-xl border-2 border-border bg-card hover:border-destructive/50 hover:bg-destructive/5 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center">
              {disconnecting ? <Loader2 className="w-5 h-5 text-destructive animate-spin" /> : <Trash2 className="w-5 h-5 text-destructive" />}
            </div>
            <p className="text-sm font-bold">Desconectar</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Remove a conexão. Você pode reconectar a qualquer momento.
            </p>
          </motion.button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WordPressForm({ site, onClose, onUpdate }: {
  site: any;
  onClose: () => void;
  onUpdate: () => Promise<void>;
}) {
  // URL is locked to the registered site URL — prevents publishing to a site the user doesn't own
  const wpUrl = (site.url ?? "").replace(/\/+$/, "");
  const displayUrl = wpUrl.replace(/^https?:\/\//, "");
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const test = async () => {
    if (!wpUser || !wpPass) {
      toast.error("Preencha usuário e senha primeiro.");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/integrations/test-wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wpUrl, wpUsername: wpUser, wpAppPassword: wpPass }),
      });
      const data = await res.json();
      if (data.error) toast.error(data.error);
      else toast.success("Funcionou! Agora salve.");
    } catch {
      toast.error("Não conseguimos testar agora.");
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/save-wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site.id, wpUrl, wpUsername: wpUser, wpAppPassword: wpPass }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("WordPress conectado!");
        await onUpdate();
        onClose();
      } else {
        toast.error(data.error || "Não conseguimos salvar.");
      }
    } catch {
      toast.error("Não conseguimos salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-border bg-muted/10 p-4 space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Site</Label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/30 text-sm font-mono select-none">
          <span className="text-muted-foreground">https://</span>
          <span className="text-foreground font-semibold">{displayUrl}</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Travado pro site cadastrado.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Usuário do WordPress</Label>
        <Input value={wpUser} onChange={e => setWpUser(e.target.value)} placeholder="admin" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-2">
          Senha de aplicativo
          <a
            href="https://wordpress.com/support/security/two-step-authentication/application-specific-passwords/"
            target="_blank" rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5 text-[11px]"
          >
            como gerar <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </Label>
        <Input type="password" value={wpPass} onChange={e => setWpPass(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Não é a senha do WP normal — é uma senha especial que você gera no painel do WordPress.
        </p>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={test} disabled={testing} className="gap-1.5">
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
          Testar
        </Button>
        <Button size="sm" onClick={save} disabled={saving} className="gap-1.5 ml-auto">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
