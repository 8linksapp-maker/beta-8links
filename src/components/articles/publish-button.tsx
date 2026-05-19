"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Send, Loader2, ExternalLink, Plug, Check, X, AlertTriangle,
} from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ChooseIntegrationDialog } from "./choose-integration-dialog";
import { NoIntegrationDialog } from "./no-integration-dialog";

type PublishedInfo = { publishedUrl: string };
type Via = "wordpress" | "github";
type PublishStatus = { hasWp: boolean; hasGithub: boolean; siteId: string; siteUrl: string };

interface Props extends Pick<ButtonProps, "size" | "variant" | "className"> {
  articleId: string;
  /** Called after a successful publish so parent state can refresh. */
  onPublished?: (info: PublishedInfo) => void;
  /** Default: "Publicar" */
  label?: string;
  /** Default: <Send /> */
  iconOnly?: boolean;
  /**
   * Called before publishing — use it to auto-save the editor's pending content
   * so the publish reflects the latest edits.
   */
  beforePublish?: () => Promise<void>;
}

/**
 * Publishes an article to the linked client_site.
 * Routes to WordPress or GitHub depending on what the site has connected:
 * - none connected → NoIntegrationDialog (CTA pro /integracoes)
 * - só WP → publica direto
 * - só GitHub → publica direto (commit no repo)
 * - ambos → ChooseIntegrationDialog
 *
 * Mantém o JIT ConnectWordPressDialog se o backend devolver `wp_not_configured`
 * (borda: user escolheu WP mas site não tem credencial salva ainda).
 */
export function PublishArticleButton({
  articleId,
  onPublished,
  label = "Publicar",
  iconOnly = false,
  size = "sm",
  variant,
  className,
  beforePublish,
}: Props) {
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [chooseOpen, setChooseOpen] = useState(false);
  const [noIntegOpen, setNoIntegOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupSiteId, setSetupSiteId] = useState<string | null>(null);
  const [setupSiteUrl, setSetupSiteUrl] = useState<string>("");

  async function ensureStatus(): Promise<PublishStatus | null> {
    if (status) return status;
    try {
      const res = await fetch(`/api/articles/${articleId}/publish-status`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Não conseguimos abrir agora.");
        return null;
      }
      const s: PublishStatus = {
        hasWp: !!data.hasWp,
        hasGithub: !!data.hasGithub,
        siteId: data.siteId ?? "",
        siteUrl: data.siteUrl ?? "",
      };
      setStatus(s);
      return s;
    } catch {
      toast.error("Não conseguimos abrir agora. Tente de novo.");
      return null;
    }
  }

  async function onClickPublish() {
    if (publishing) return;
    const s = await ensureStatus();
    if (!s) return;
    if (!s.hasWp && !s.hasGithub) {
      setNoIntegOpen(true);
      return;
    }
    if (s.hasWp && s.hasGithub) {
      setChooseOpen(true);
      return;
    }
    // Só uma integração conectada — vai direto
    await publish(undefined);
  }

  async function publish(via: Via | undefined) {
    setPublishing(true);
    try {
      if (beforePublish) {
        await beforePublish();
      }
      const res = await fetch(`/api/articles/${articleId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(via ? { via } : {}),
      });
      const data = await res.json();

      // Roteamento via code (backend é fonte de verdade — robusto contra race
      // entre /publish-status e /publish)
      if (data.code === "no_integration") {
        setChooseOpen(false);
        setNoIntegOpen(true);
        return;
      }
      if (data.code === "choose_integration") {
        setNoIntegOpen(false);
        setChooseOpen(true);
        return;
      }
      if (data.code === "wp_not_configured") {
        // JIT — abre setup do WP com siteId + URL travada
        setSetupSiteId(data.siteId ?? null);
        setSetupSiteUrl(data.siteUrl ?? "");
        setChooseOpen(false);
        setSetupOpen(true);
        return;
      }
      if (data.code === "wp_auth_failed") {
        toast.error(data.error || "Sua conexão com WordPress falhou. Reconecte em Integrações.");
        return;
      }
      if (data.code === "github_auth_failed") {
        toast.error("Sua conexão com GitHub venceu. Reconecte em Integrações.");
        return;
      }
      if (data.code === "github_repo_error") {
        toast.error(data.error || "Não conseguimos fazer commit no GitHub.");
        return;
      }
      if (data.code === "slug_conflict") {
        toast.error(data.error || "Esse artigo já existe no repositório.");
        return;
      }
      if (!res.ok || !data.success) {
        toast.error(data.error || "Não conseguimos publicar agora.");
        return;
      }

      // Sucesso — fecha o chooser (caso tenha vindo dele) e toast por integração
      setChooseOpen(false);
      const finalVia: Via = data.via ?? via ?? (status?.hasWp ? "wordpress" : "github");
      const successCopy =
        finalVia === "github"
          ? "Commit feito! Vai aparecer no site em 2-5min após o deploy."
          : "Publicado no seu site!";

      toast.success(successCopy, {
        action: data.publishedUrl
          ? { label: "Abrir", onClick: () => window.open(data.publishedUrl, "_blank") }
          : undefined,
      });
      onPublished?.({ publishedUrl: data.publishedUrl });
    } catch {
      toast.error("Não conseguimos publicar agora. Tente novamente.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={className}
        onClick={onClickPublish}
        disabled={publishing}
      >
        {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {!iconOnly && <span className={size === "sm" ? "text-xs" : ""}>{publishing ? "Publicando..." : label}</span>}
      </Button>

      <ChooseIntegrationDialog
        open={chooseOpen}
        onClose={() => setChooseOpen(false)}
        onChoose={(via) => publish(via)}
        publishing={publishing}
      />

      <NoIntegrationDialog
        open={noIntegOpen}
        onClose={() => setNoIntegOpen(false)}
        siteUrl={status?.siteUrl ?? ""}
      />

      <ConnectWordPressDialog
        siteId={setupSiteId}
        siteUrl={setupSiteUrl}
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onConnected={() => {
          setSetupOpen(false);
          // Invalida cache de status pra refetchar (pode ter mudado hasWp)
          setStatus(null);
          // Auto-retry: como agora tem WP, manda explícito
          publish("wordpress");
        }}
      />
    </>
  );
}

function ConnectWordPressDialog({ siteId, siteUrl, open, onClose, onConnected }: {
  siteId: string | null;
  siteUrl: string;
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}) {
  // URL is locked to the registered site URL — prevents publishing to a site the user doesn't own
  const wpUrl = siteUrl;
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tested, setTested] = useState(false);

  const displayUrl = wpUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  const reset = () => {
    setWpUser(""); setWpPass(""); setTested(false);
  };

  const test = async () => {
    if (!wpUrl || !wpUser || !wpPass) {
      toast.error("Preencha tudo primeiro.");
      return;
    }
    setTesting(true);
    setTested(false);
    try {
      const res = await fetch("/api/integrations/test-wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wpUrl, wpUsername: wpUser, wpAppPassword: wpPass }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message ?? "Conexão OK!");
        setTested(true);
      }
    } catch {
      toast.error("Não conseguimos testar agora.");
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!siteId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/save-wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, wpUrl, wpUsername: wpUser, wpAppPassword: wpPass }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("WordPress conectado!");
        reset();
        onConnected();
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
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="w-5 h-5 text-primary" /> Conectar com seu WordPress
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            Em 1 minuto seu artigo vai pro ar direto no seu site. Você só precisa fazer isso uma vez por site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Site</Label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40 text-sm font-mono select-none">
              <span className="text-muted-foreground">https://</span>
              <span className="text-foreground font-semibold">{displayUrl}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Travado pro site que você cadastrou. Só dá pra publicar nesse domínio.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Usuário do WordPress</Label>
            <Input
              placeholder="admin"
              value={wpUser}
              onChange={(e) => { setWpUser(e.target.value); setTested(false); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-2">
              Senha de aplicativo
              <a
                href="https://wordpress.com/support/security/two-step-authentication/application-specific-passwords/"
                target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5 text-[11px] font-normal"
              >
                como gerar <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </Label>
            <Input
              type="password"
              placeholder="xxxx xxxx xxxx xxxx"
              value={wpPass}
              onChange={(e) => { setWpPass(e.target.value); setTested(false); }}
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Não é a senha normal — é uma senha especial gerada no painel do WordPress (Usuários → Perfil → Application Passwords).
            </p>
          </div>

          {tested && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success-light text-success text-sm font-semibold">
              <Check className="w-4 h-4" /> Conexão OK! Agora é só salvar.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-row">
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" /> Cancelar
          </Button>
          <Button variant="outline" onClick={test} disabled={testing} className="gap-1.5">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Testar
          </Button>
          <Button onClick={save} disabled={saving || !tested} className="gap-1.5 ml-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Salvar e publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
