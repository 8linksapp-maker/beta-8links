"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Globe, ArrowRight, ArrowLeft, Check, Loader2, Sparkles,
  Cpu, HeartPulse, Banknote, GraduationCap, ShoppingCart,
  Megaphone, Scale, Home, Utensils, Car, Shirt, Palette,
  PawPrint, Plane, Trophy, Gamepad2, Baby, Wheat, HardHat, Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const NICHE_OPTIONS = [
  { value: "Tecnologia", icon: Cpu, color: "text-sky-400" },
  { value: "Saúde", icon: HeartPulse, color: "text-red-400" },
  { value: "Finanças", icon: Banknote, color: "text-emerald-400" },
  { value: "Educação", icon: GraduationCap, color: "text-amber-400" },
  { value: "E-commerce", icon: ShoppingCart, color: "text-orange-400" },
  { value: "Marketing", icon: Megaphone, color: "text-pink-400" },
  { value: "Jurídico", icon: Scale, color: "text-slate-300" },
  { value: "Imobiliário", icon: Home, color: "text-yellow-500" },
  { value: "Alimentação", icon: Utensils, color: "text-orange-300" },
  { value: "Automotivo", icon: Car, color: "text-blue-400" },
  { value: "Moda", icon: Shirt, color: "text-fuchsia-400" },
  { value: "Beleza", icon: Palette, color: "text-rose-400" },
  { value: "Pets", icon: PawPrint, color: "text-amber-300" },
  { value: "Viagem", icon: Plane, color: "text-cyan-400" },
  { value: "Esportes", icon: Trophy, color: "text-yellow-400" },
  { value: "Jogos", icon: Gamepad2, color: "text-violet-400" },
  { value: "Infantil", icon: Baby, color: "text-pink-300" },
  { value: "Agronegócio", icon: Wheat, color: "text-yellow-600" },
  { value: "Construção", icon: HardHat, color: "text-orange-500" },
  { value: "Sustentabilidade", icon: Leaf, color: "text-green-400" },
] as const;

type Step = "url" | "description" | "niche";

function OnboardingContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("url");
  const [siteUrl, setSiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [niche, setNiche] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const goToDescription = () => {
    if (!siteUrl.trim()) { toast.error("Digite a URL do seu site"); return; }
    setStep("description");
  };

  const goToNiche = () => setStep("niche");

  const finish = async () => {
    if (!niche) { toast.error("Escolha um nicho"); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }

      const url = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;

      const siteContext = description.trim()
        ? { gptSummary: description.trim(), source: "user-onboarding" }
        : null;

      // Create site
      const { data: site, error: siteError } = await supabase
        .from("client_sites")
        .insert({
          user_id: user.id,
          url,
          niche_primary: niche,
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

  const stepIndex = step === "url" ? 0 : step === "description" ? 1 : 2;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[0, 1, 2].map((i) => (
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
                    onClick={goToNiche}
                  >
                    Pular
                  </Button>
                  <Button
                    size="xl"
                    className="sm:flex-1"
                    onClick={goToNiche}
                  >
                    Continuar <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "niche" && (
            <motion.div
              key="niche"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <button
                type="button"
                onClick={() => setStep("description")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>

              <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-4xl font-black font-[family-name:var(--font-display)] tracking-tight mb-3">
                  Qual nicho descreve seu site?
                </h1>
                <p className="text-base text-muted-foreground">
                  Pra gente sugerir as melhores palavras pra você posicionar.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {NICHE_OPTIONS.map(({ value, icon: Icon, color }) => {
                  const selected = niche === value;
                  return (
                    <motion.button
                      key={value}
                      type="button"
                      onClick={() => setNiche(value)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      {selected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </motion.div>
                      )}
                      <Icon className={`w-7 h-7 ${selected ? "text-primary" : color}`} />
                      <span className={`text-xs font-semibold text-center ${selected ? "text-primary" : ""}`}>
                        {value}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <Button
                size="xl"
                className="w-full"
                disabled={!niche || saving}
                onClick={finish}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Cadastrando...</>
                ) : (
                  <>Pronto, vamos começar! <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
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
