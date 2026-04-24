"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Link as LinkIcon, Check, Shield, CreditCard, Zap,
  ArrowLeft, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PLANS } from "@/lib/constants";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const planId = (searchParams.get("plan") ?? "pro") as keyof typeof PLANS;
  const plan = PLANS[planId] ?? PLANS.pro;
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? "Erro ao criar checkout");
        setLoading(false);
      }
    } catch {
      toast.error("Erro de conexão");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,hsl(24_100%_55%/0.06),transparent_60%)]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar aos planos
        </Link>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[hsl(35,100%,60%)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_hsl(24_100%_55%/0.2)]">
            <LinkIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black font-[family-name:var(--font-display)] tracking-tight">
            Assinar plano <span className="text-gradient">{plan.name}</span>
          </h1>
        </div>

        <Card className="card-beam relative overflow-hidden">
          <CardContent className="p-6 space-y-5">
            {/* Plan summary */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Plano {plan.name}</p>
                <p className="text-xs text-muted-foreground">Cobrança mensal</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black font-[family-name:var(--font-display)]">
                  R$ {plan.price}
                </p>
                <p className="text-xs text-muted-foreground font-mono">/mês</p>
              </div>
            </div>

            <Separator />

            {/* Features */}
            <div className="space-y-2">
              {[
                `${plan.limits.sites >= 999 ? "Sites ilimitados" : `${plan.limits.sites} site${plan.limits.sites > 1 ? 's' : ''}`}`,
                "Backlinks ilimitados",
                `${plan.limits.articlesMonthly >= 999 ? "Artigos IA ilimitados" : `${plan.limits.articlesMonthly} artigos IA/mês`}`,
                `${plan.limits.keywordPlansMonthly} planejamento${plan.limits.keywordPlansMonthly > 1 ? 's' : ''} de keywords/mês`,
                "Google Analytics + Search Console",
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Trial info */}
            <div className="bg-primary-light rounded-xl p-4 border border-primary/20 text-center">
              <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-sm font-bold">14 dias grátis</p>
              <p className="text-xs text-muted-foreground">Você não será cobrado agora. O primeiro pagamento será em 14 dias.</p>
            </div>

            {/* Payment buttons */}
            <div className="space-y-3">
              <Button size="xl" className="w-full" onClick={handleCheckout} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><CreditCard className="w-4 h-4" /> Pagar com Cartão</>}
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => { /* TODO: Kiwify redirect */ }}>
                Pagar com PIX
              </Button>
            </div>

            {/* Security badges */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5" /> SSL Seguro
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CreditCard className="w-3.5 h-3.5" /> Stripe
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Ao assinar, você concorda com nossos termos de uso. Cancele quando quiser.
        </p>
      </motion.div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
