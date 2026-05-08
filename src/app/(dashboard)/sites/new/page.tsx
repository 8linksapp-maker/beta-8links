"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { PLANS } from "@/lib/constants";

const STEPS = ["url", "niche"] as const;

const NICHE_OPTIONS = [
  "Tecnologia", "Saúde", "Finanças", "Contabilidade", "Educação", "E-commerce",
  "Marketing", "Jurídico", "Imobiliário", "Alimentação", "Automotivo",
  "Moda", "Beleza", "Pets", "Viagem", "Esportes",
  "Jogos", "Infantil", "Agronegócio", "Construção", "Sustentabilidade",
];

export default function NewSitePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [siteUrl, setSiteUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [customNiche, setCustomNiche] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const currentStep = STEPS[step];

  const toggleNiche = (niche: string) => {
    setSelectedNiches(prev => {
      if (prev.includes(niche)) return prev.filter(n => n !== niche);
      if (prev.length >= 3) {
        toast("Máximo 3 nichos");
        return prev;
      }
      return [...prev, niche];
    });
  };

  const goToNiche = () => {
    if (!siteUrl.trim()) return;
    setStep(1);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sua sessão expirou. Faça login novamente.");
        setSaving(false);
        return;
      }

      // Subscription + limit checks
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_id, subscription_status")
        .eq("id", user.id)
        .single();
      if (!profile || !["active", "trialing"].includes(profile.subscription_status)) {
        toast.error("Sua assinatura está com pendência. Atualize a forma de pagamento para adicionar mais sites.");
        setSaving(false);
        return;
      }
      const planId = (profile.plan_id || "starter") as keyof typeof PLANS;
      const plan = PLANS[planId] ?? PLANS.starter;
      const siteLimit = plan.limits.sites;
      const { count } = await supabase
        .from("client_sites")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if ((count ?? 0) >= siteLimit) {
        toast.error(
          `Limite de ${siteLimit >= 999 ? "sites" : siteLimit + " site" + (siteLimit > 1 ? "s" : "")} atingido no plano ${plan.name}. Faça upgrade para adicionar mais.`,
        );
        setSaving(false);
        return;
      }

      const finalNichePrimary = selectedNiches[0] || (showCustom && customNiche.trim() ? customNiche.trim() : null);
      const finalNicheSecondary = selectedNiches[1] ?? null;

      const { error } = await supabase
        .from("client_sites")
        .insert({
          user_id: user.id,
          url: siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`,
          niche_primary: finalNichePrimary,
          niche_secondary: finalNicheSecondary,
          da_current: 0,
          da_history: [],
          seo_score: 0,
          phase: "planting",
          autopilot_active: true,
        });

      if (error) {
        console.error("[sites/new] insert failed:", error);
        toast.error("Não conseguimos cadastrar seu site agora. Tente de novo em alguns instantes.");
        setSaving(false);
        return;
      }

      toast.success("Pronto! Seu site foi adicionado.");
      // Hard navigation pra forçar refetch dos hooks (useActiveSite etc.) — evita
      // a tela do dashboard mostrar 0 quando acabamos de inserir.
      window.location.href = "/dashboard";
    } catch (e) {
      console.error("[sites/new] save failed:", e);
      toast.error("Não conseguimos cadastrar seu site agora. Tente de novo em alguns instantes.");
      setSaving(false);
    }
  };

  const canContinue =
    selectedNiches.length > 0 || (showCustom && customNiche.trim().length > 0);

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-10 h-0.5 rounded ${i < step ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: URL */}
          {currentStep === "url" && (
            <motion.div key="url" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">
                  Adicionar novo site
                </h1>
                <p className="text-muted-foreground">
                  Cole a URL do site que você quer subir no Google.
                </p>
              </div>
              <div className="card-beam rounded-2xl border bg-card p-8 relative overflow-hidden">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL do site</Label>
                    <Input
                      placeholder="https://meusite.com.br"
                      value={siteUrl}
                      onChange={e => setSiteUrl(e.target.value)}
                      className="h-12 text-base"
                      onKeyDown={e => {
                        if (e.key === "Enter" && siteUrl.trim()) goToNiche();
                      }}
                      autoFocus
                    />
                  </div>
                  <Button size="xl" className="w-full" disabled={!siteUrl.trim()} onClick={goToNiche}>
                    Continuar <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="text-center mt-4">
                <Button variant="ghost" onClick={() => router.push("/sites")} className="text-muted-foreground">
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Niche */}
          {currentStep === "niche" && (
            <motion.div key="niche" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">
                  Sobre o que é esse site?
                </h1>
                <p className="text-muted-foreground">
                  Selecione 1 a 3 nichos. A gente usa isso pra escolher os melhores sites parceiros pros seus backlinks.
                </p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {NICHE_OPTIONS.map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggleNiche(n)}
                        className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${
                          selectedNiches.includes(n)
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {selectedNiches.includes(n) && <Check className="w-3 h-3 inline mr-1" />}
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustom(!showCustom)}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  {showCustom ? "Fechar" : "Não encontrou? Digite o seu"}
                </button>
                {showCustom && (
                  <Input
                    placeholder="Ex: Equinos, Energia Solar..."
                    value={customNiche}
                    onChange={e => setCustomNiche(e.target.value)}
                  />
                )}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setStep(0)}>
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </Button>
                  <Button onClick={handleSave} disabled={!canContinue || saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        Adicionar site <ArrowRight className="w-4 h-4" />
                      </>
                    )}
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
