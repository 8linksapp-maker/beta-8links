"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Check, FileSearch, Trash2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { NICHE_OPTIONS, getNiche } from "@/lib/niches";
import { createClient } from "@/lib/supabase/client";

type Props = {
  siteId: string | null;
  siteUrl: string;
  /** Current niche of the site — when set, opens with the chooser (Redefinir / Excluir) */
  currentNiche?: string | null;
  open: boolean;
  onClose: () => void;
  /** Called after primary niche is saved. Pass null when niche was cleared. */
  onSaved: (niche: string | null) => void;
};

export function DetectNicheDialog({ siteId, siteUrl, currentNiche, open, onClose, onSaved }: Props) {
  const [phase, setPhase] = useState<"chooser" | "loading" | "select" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [pagesAnalyzed, setPagesAnalyzed] = useState<number | null>(null);
  const [primary, setPrimary] = useState<string | null>(null);
  const [secondaries, setSecondaries] = useState<Set<string>>(new Set());
  const [aiSuggested, setAiSuggested] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const runDetection = useCallback(async () => {
    if (!siteId) return;
    setPhase("loading");
    setErrorMsg("");
    setPagesAnalyzed(null);
    setPrimary(null);
    setSecondaries(new Set());
    setAiSuggested(null);

    try {
      const res = await fetch(`/api/sites/${siteId}/detect-niche`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Não conseguimos analisar agora.");
        setPhase("select");
        return;
      }
      setPagesAnalyzed(data.pagesAnalyzed ?? 0);
      setPrimary(data.suggestion.primary);
      setAiSuggested(data.suggestion.primary);
      setSecondaries(new Set(data.suggestion.alternates ?? []));
      setPhase("select");
    } catch {
      setErrorMsg("Não conseguimos analisar agora. Tente em alguns instantes.");
      setPhase("select");
    }
  }, [siteId]);

  // When dialog opens: chooser if there's already a niche, otherwise jump straight to detection
  useEffect(() => {
    if (!open || !siteId) return;
    if (currentNiche) {
      setPhase("chooser");
    } else {
      runDetection();
    }
  }, [open, siteId, currentNiche, runDetection]);

  const clearNiche = async () => {
    if (!siteId) return;
    setClearing(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("client_sites")
        .update({ niche_primary: null, niche_secondary: null })
        .eq("id", siteId);
      if (error) {
        toast.error("Não conseguimos excluir. Tente de novo.");
        return;
      }
      toast.success("Nicho excluído");
      onSaved(null);
      onClose();
    } finally {
      setClearing(false);
    }
  };

  const togglePrimary = (value: string) => {
    if (primary === value) return; // can't deselect primary, must pick another
    setPrimary(value);
    // If user picked something that was a secondary, remove it from secondaries
    setSecondaries(prev => {
      const next = new Set(prev);
      next.delete(value);
      return next;
    });
  };

  const toggleSecondary = (value: string) => {
    if (value === primary) return; // primary can't also be secondary
    setSecondaries(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const save = async () => {
    if (!siteId || !primary) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const secondaryString = secondaries.size > 0 ? Array.from(secondaries).join(",") : null;
      const { error } = await supabase
        .from("client_sites")
        .update({ niche_primary: primary, niche_secondary: secondaryString })
        .eq("id", siteId);
      if (error) {
        toast.error("Não conseguimos salvar. Tente de novo.");
        return;
      }
      toast.success(`Nicho definido: ${primary}`);
      onSaved(primary);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const cleanUrl = siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Definir nicho do site
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            <span className="font-mono text-foreground/80">{cleanUrl}</span>
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {phase === "chooser" && currentNiche && (
            <motion.div
              key="chooser"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-2 space-y-4"
            >
              {/* Current niche display */}
              {(() => {
                const def = getNiche(currentNiche);
                if (!def) return null;
                const Icon = def.icon;
                return (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/40 border border-border">
                    <div className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
                      <Icon className={`w-5 h-5 ${def.color}`} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-mono font-semibold text-muted-foreground">Nicho atual</p>
                      <p className="text-base font-bold">{currentNiche}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Two action cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  onClick={runDetection}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex flex-col items-center text-center gap-2 p-5 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-bold">Redefinir nicho</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Analisa seu site de novo e sugere baseado nas páginas atuais.
                  </p>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={clearNiche}
                  disabled={clearing}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex flex-col items-center text-center gap-2 p-5 rounded-xl border-2 border-border bg-card hover:border-destructive/50 hover:bg-destructive/5 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center">
                    {clearing ? <Loader2 className="w-5 h-5 text-destructive animate-spin" /> : <Trash2 className="w-5 h-5 text-destructive" />}
                  </div>
                  <p className="text-sm font-bold">Excluir nicho</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Remove o nicho deste site. Você pode definir outro depois.
                  </p>
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-14 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_32px_hsl(24_100%_55%/0.2)] relative">
                <FileSearch className="w-7 h-7 text-primary" />
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-primary/30"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <p className="text-base font-bold mb-1.5">Analisando seu site...</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Lendo as páginas, títulos e descrições pra sugerir o nicho que combina com o que você publica.
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>uns 5–10 segundos</span>
              </div>
            </motion.div>
          )}

          {phase === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="py-2 space-y-6"
            >
              {/* Feedback bar — what we read */}
              {pagesAnalyzed !== null && pagesAnalyzed > 0 ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-success-light border border-success/20">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <p className="text-sm leading-snug">
                    Analisamos <span className="font-bold text-foreground">{pagesAnalyzed} {pagesAnalyzed === 1 ? "página" : "páginas"}</span> do seu site.
                    {aiSuggested && <> Sugerimos <span className="font-bold text-primary">{aiSuggested}</span> como principal.</>}
                  </p>
                </div>
              ) : errorMsg ? (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-warning-light border border-warning/20">
                  <Sparkles className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-sm leading-snug">
                    {errorMsg} Pode escolher manualmente abaixo.
                  </p>
                </div>
              ) : null}

              {/* Primary niche grid */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-xs uppercase tracking-wider font-mono font-semibold text-muted-foreground">
                    Nicho principal <span className="text-destructive">*</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">escolha 1</p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {NICHE_OPTIONS.map(({ value, icon: Icon, color }) => {
                    const isPrimary = primary === value;
                    const isSecondary = secondaries.has(value);
                    return (
                      <motion.button
                        key={value}
                        type="button"
                        onClick={() => togglePrimary(value)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border-2 transition-colors cursor-pointer ${
                          isPrimary
                            ? "border-primary bg-primary/5 shadow-[0_0_20px_hsl(24_100%_55%/0.15)]"
                            : isSecondary
                              ? "border-primary/30 bg-primary/[0.03] opacity-60"
                              : "border-border bg-card hover:border-primary/30"
                        }`}
                      >
                        {isPrimary && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                          >
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </motion.div>
                        )}
                        <Icon className={`w-7 h-7 ${isPrimary ? "text-primary" : color}`} />
                        <span className={`text-xs font-semibold text-center ${isPrimary ? "text-primary" : ""}`}>
                          {value}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Secondary niches */}
              {primary && (
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="text-xs uppercase tracking-wider font-mono font-semibold text-muted-foreground">
                      Nichos relacionados <span className="text-muted-foreground/60 font-normal normal-case ml-1">opcional</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {secondaries.size > 0 ? `${secondaries.size} selecionado${secondaries.size === 1 ? "" : "s"}` : "marque os que se aplicam"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {NICHE_OPTIONS.filter(n => n.value !== primary).map(({ value, icon: Icon, color }) => {
                      const isSelected = secondaries.has(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleSecondary(value)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card hover:border-primary/30 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : color}`} />
                          {value}
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-6 text-center"
            >
              <p className="text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "select" && (
          <DialogFooter className="gap-2 flex-row">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={!primary || saving}
              className="gap-1.5 ml-auto"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar nicho
            </Button>
          </DialogFooter>
        )}

        {phase === "chooser" && (
          <DialogFooter className="gap-2 flex-row">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
