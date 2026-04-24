"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe, Search, ArrowRight, Check, Loader2,
  Link as LinkIcon, Sparkles, TrendingUp, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Badge } from "@/components/ui/badge";

const mockResults = {
  niche: "Tecnologia",
  totalSites: 47,
  categories: [
    { name: "Tecnologia & Gadgets", count: 14, avgDa: 38, emoji: "💻" },
    { name: "Reviews & Comparativos", count: 9, avgDa: 42, emoji: "⭐" },
    { name: "Portais de Notícias", count: 12, avgDa: 48, emoji: "📰" },
    { name: "Blogs & Lifestyle", count: 8, avgDa: 32, emoji: "✍️" },
    { name: "E-commerce & Negócios", count: 4, avgDa: 35, emoji: "🛒" },
  ],
};

export default function VerificarNichePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<typeof mockResults | null>(null);

  const handleCheck = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResult(mockResults);
    }, 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,hsl(24_100%_55%/0.06),transparent_60%)]" />
      </div>

      <div className="w-full max-w-xl relative">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(24,100%,55%)] to-[hsl(35,100%,60%)] flex items-center justify-center">
              <LinkIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-black font-[family-name:var(--font-display)]">8links</span>
          </Link>
          <h1 className="text-3xl font-black font-[family-name:var(--font-display)] tracking-tight mb-3">
            Funciona pro <span className="text-gradient">seu nicho</span>?
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Cole a URL do seu site e descubra em 5 segundos quantos sites parceiros temos para o seu nicho.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="card-beam rounded-2xl border bg-card p-8 relative overflow-hidden">
                <div className="space-y-4">
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="https://meusite.com.br"
                      className="h-14 text-base pl-12"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>
                  <Button
                    size="xl"
                    className="w-full"
                    disabled={!url || loading}
                    onClick={handleCheck}
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
                    ) : (
                      <><Search className="w-4 h-4" /> Verificar meu nicho</>
                    )}
                  </Button>
                </div>

                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-3">
                    {["Detectando nicho...", "Buscando sites parceiros...", "Calculando compatibilidade..."].map((step, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.8 }} className="flex items-center gap-3">
                        {i * 0.8 + 0.8 < 3 ? (
                          <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center"><Check className="w-3 h-3 text-success" /></div>
                        ) : (
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        )}
                        <span className="text-sm text-muted-foreground">{step}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-2xl border bg-card overflow-hidden">
                {/* Result header */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Nicho detectado: <span className="text-primary">{result.niche}</span></p>
                      <p className="text-xs text-muted-foreground font-mono">{url}</p>
                    </div>
                  </div>

                  <div className="bg-primary-light rounded-xl p-5 border border-primary/20 text-center">
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2">Sites parceiros compatíveis</p>
                    <p className="text-4xl font-black font-[family-name:var(--font-display)] tracking-tight text-gradient">
                      <NumberTicker value={result.totalSites} />
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">prontos para linkar para o seu site</p>
                  </div>
                </div>

                {/* Categories */}
                <div className="p-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-4">
                    Categorias que vão linkar para você
                  </p>
                  <div className="space-y-3">
                    {result.categories.map((cat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{cat.emoji}</span>
                          <div>
                            <p className="text-sm font-medium">{cat.name}</p>
                            <p className="text-xs text-muted-foreground">{cat.count} sites • AP médio: {cat.avgDa}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px]">{cat.count} sites</Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div className="px-6 pb-4">
                  <div className="bg-muted/30 rounded-xl p-4 border border-border">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">Não precisa ser um site idêntico ao seu.</span> O Google valoriza links de sites do mesmo universo temático — e nós temos de sobra para o seu nicho.
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <div className="p-6 border-t border-border bg-muted/20">
                  <Link href="/register" className="btn-glow rounded-xl w-full py-3.5 text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer">
                    <Zap className="w-5 h-5" /> Começar com {result.totalSites} sites parceiros <ArrowRight className="w-4 h-4" />
                  </Link>
                  <p className="text-center text-xs text-muted-foreground mt-3">14 dias grátis • Backlinks ilimitados • Cancele quando quiser</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
