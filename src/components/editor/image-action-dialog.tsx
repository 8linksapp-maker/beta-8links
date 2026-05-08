"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Search, Link as LinkIcon, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

type Mode = "insert" | "replace";
type Tab = "search" | "upload" | "url";

type SearchResult = { url: string; description?: string; credit?: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  /** Tema usado pra buscar imagem (título do artigo, H2 etc.) */
  searchContext?: string;
  /** URLs já usadas no artigo — pro buscador trazer outra */
  excludeUrls?: string[];
  onConfirm: (url: string) => void;
  /** Só aparece em modo "replace" */
  onRemove?: () => void;
}

export function ImageActionDialog({
  open,
  onOpenChange,
  mode,
  searchContext,
  excludeUrls = [],
  onConfirm,
  onRemove,
}: Props) {
  const [tab, setTab] = useState<Tab>("search");
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reseta ao abrir/fechar e pré-preenche o termo de busca
  useEffect(() => {
    if (open) {
      setTab("search");
      setSearchQuery(searchContext ?? "");
      setResults([]);
      setUrl("");
      setLoading(false);
    }
  }, [open, searchContext]);

  const finish = (chosen: string) => {
    onConfirm(chosen);
    onOpenChange(false);
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/find-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heading: q,
          excludeUrls: [...excludeUrls, ...results.map(r => r.url)],
        }),
      });
      const data = await res.json();
      if (data?.url) {
        setResults(prev => [...prev, { url: data.url, description: data.description, credit: data.credit }]);
      } else {
        toast.error("Nenhuma imagem encontrada para esse tema. Tente outras palavras.");
      }
    } catch (e) {
      console.error("[image-search]", e);
      toast.error("Não foi possível buscar a imagem agora. Tente novamente.");
    }
    setLoading(false);
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem (JPG, PNG ou WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. O limite é 5 MB.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sua sessão expirou. Faça login novamente.");
        setLoading(false);
        return;
      }
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `articles/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("public").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) {
        console.error("[image-upload]", upErr);
        toast.error("Não conseguimos enviar essa imagem. Tente outra.");
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("public").getPublicUrl(path);
      finish(urlData.publicUrl);
    } catch (e) {
      console.error("[image-upload]", e);
      toast.error("Não conseguimos enviar essa imagem. Tente novamente.");
    }
    setLoading(false);
  };

  const handleUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      toast.error("Cole uma URL válida (precisa começar com http:// ou https://).");
      return;
    }
    finish(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "replace" ? "Trocar imagem" : "Adicionar imagem"}</DialogTitle>
          <DialogDescription>
            Escolha uma imagem para o artigo: busque uma foto pronta, envie do seu computador ou cole uma URL.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/40 rounded-lg mb-4">
          {([
            { v: "search", label: "Buscar", icon: Search },
            { v: "upload", label: "Enviar do PC", icon: Upload },
            { v: "url", label: "Colar URL", icon: LinkIcon },
          ] as const).map(t => (
            <button
              key={t.v}
              type="button"
              onClick={() => setTab(t.v)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                tab === t.v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "search" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Ex.: contabilidade, marketing digital, advocacia..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()} className="gap-1.5 shrink-0">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Buscar
              </Button>
            </div>

            {results.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {loading
                  ? "Procurando uma imagem para o tema..."
                  : 'Digite o tema do artigo e clique em "Buscar" para ver opções.'}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {results.map((r, i) => (
                    <button
                      key={`${r.url}-${i}`}
                      type="button"
                      onClick={() => finish(r.url)}
                      className="relative group rounded-lg overflow-hidden border border-border hover:border-primary transition-colors cursor-pointer text-left"
                    >
                      <img src={r.url} alt={r.description ?? ""} className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-primary text-primary-foreground rounded-full p-2">
                          <Check className="w-4 h-4" />
                        </span>
                      </div>
                      {r.credit && (
                        <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                          {r.credit}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full text-xs gap-1.5"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  Buscar outra opção
                </Button>
              </>
            )}
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileRef}
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="w-full border-2 border-dashed border-border hover:border-primary/40 rounded-xl py-12 flex flex-col items-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {loading ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-muted-foreground" />
              )}
              <span className="text-sm font-semibold">
                {loading ? "Enviando imagem..." : "Clique para escolher uma imagem"}
              </span>
              <span className="text-xs text-muted-foreground">JPG, PNG ou WEBP — até 5 MB</span>
            </button>
          </div>
        )}

        {tab === "url" && (
          <div className="space-y-3">
            <Input
              placeholder="https://exemplo.com/imagem.jpg"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleUrl();
                }
              }}
            />
            {url && /^https?:\/\//i.test(url.trim()) && (
              <div className="rounded-lg overflow-hidden border border-border bg-muted/30 max-h-60 flex items-center justify-center">
                <img
                  src={url}
                  alt="Pré-visualização"
                  className="max-w-full max-h-60 object-contain"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <Button onClick={handleUrl} disabled={!url.trim()} className="w-full">
              Usar essa imagem
            </Button>
          </div>
        )}

        {mode === "replace" && onRemove && (
          <div className="flex justify-between items-center border-t border-border/50 pt-4 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                onRemove();
                onOpenChange(false);
              }}
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remover imagem
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
