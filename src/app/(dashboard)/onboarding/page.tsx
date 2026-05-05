"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Globe, ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Step = "url" | "description";

function OnboardingContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("url");
  const [siteUrl, setSiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const goToDescription = () => {
    if (!siteUrl.trim()) { toast.error("Digite a URL do seu site"); return; }
    setStep("description");
  };

  const finish = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }

      const url = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;

      const siteContext = description.trim()
        ? { gptSummary: description.trim(), source: "user-onboarding" }
        : null;

      // Create site (no niche — user defines later in /sites via auto-detect)
      const { data: site, error: siteError } = await supabase
        .from("client_sites")
        .insert({
          user_id: user.id,
          url,
          phase: "planting",
          autopilot_active: true,
          seo_score: 0,
          da_current: 0,
          ...(siteContext ? { site_context: siteContext } : {}),
        })
        .select().single();

      if (siteError || !site) {
        console.error("[onboarding] failed to create site:", siteError);
        toast.error("Não conseguimos cadastrar seu site. Tente novamente.");
        setSaving(false);
        return;
      }

      // Mark onboarding done in simple mode
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true, onboarding_mode: "simple" })
        .eq("id", user.id);

      if (profileError) {
        console.error("[onboarding] failed to update profile:", profileError);
        toast.error("Não conseguimos finalizar. Verifique sua conexão.");
        setSaving(false);
        return;
      }

      toast.success("Pronto! Vamos começar.");
      // Hard reload so SiteProvider remounts and picks up the new site.
      // router.push doesn't remount providers in the same layout.
      window.location.href = "/dashboard";
    } catch (e) {
      console.error("[onboarding] exception:", e);
      toast.error("Algo deu errado. Tente novamente em alguns instantes.");
      setSaving(false);
    }
  };

  const stepIndex = step === "url" ? 0 : 1;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[0, 1].map((i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${
              i < stepIndex ? "w-8 bg-primary" :
              i === stepIndex ? "w-12 bg-primary" :
              "w-8 bg-muted"
            }`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === "url" && (
            <motion.div
              key="url"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_32px_hsl(24_100%_55%/0.2)]">
                  <Globe className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black font-[family-name:var(--font-display)] tracking-tight mb-3">
                  Qual é o seu site?
                </h1>
                <p className="text-base text-muted-foreground">
                  A página que você quer que apareça mais no Google.
                </p>
              </div>

              <div className="card-beam rounded-2xl border bg-card p-6 sm:p-8">
                <Input
                  placeholder="https://meusite.com.br"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && siteUrl.trim() && goToDescription()}
                  className="h-14 text-base mb-4"
                  autoFocus
                />
                <Button
                  size="xl"
                  className="w-full"
                  disabled={!siteUrl.trim()}
                  onClick={goToDescription}
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === "description" && (
            <motion.div
              key="description"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <button
                type="button"
                onClick={() => setStep("url")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>

              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_32px_hsl(24_100%_55%/0.2)]">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black font-[family-name:var(--font-display)] tracking-tight mb-3">
                  Conte rapidinho o que você faz
                </h1>
                <p className="text-base text-muted-foreground">
                  Em uma ou duas linhas. Vamos usar isso pra escrever artigos no seu jeito.
                </p>
              </div>

              <div className="card-beam rounded-2xl border bg-card p-6 sm:p-8">
                <Textarea
                  placeholder="Ex: Loja online de cosméticos veganos pra mulheres que valorizam beleza natural"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="text-base mb-4 resize-none"
                  autoFocus
                />
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <Button
                    variant="ghost"
                    size="xl"
                    className="sm:flex-1"
                    disabled={saving}
                    onClick={finish}
                  >
                    Pular
                  </Button>
                  <Button
                    size="xl"
                    className="sm:flex-1"
                    disabled={saving}
                    onClick={finish}
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Cadastrando...</>
                    ) : (
                      <>Pronto, vamos começar! <ArrowRight className="w-4 h-4" /></>
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

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}
