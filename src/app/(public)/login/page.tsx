"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";

function InviteRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "invite") {
      router.push("/auth/accept-invite");
    }
  }, [searchParams, router]);

  return null;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message === "Invalid login credentials") {
        setError("migrate");
      } else if (authError.message === "Email not confirmed") {
        setError("Confirme seu email antes de entrar");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 overflow-hidden">
      </div>

      <Suspense>
        <InviteRedirect />
      </Suspense>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative"
      >
        <div className="text-center mb-8">
          <Logo variant="mark" size="md" className="mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold font-[family-name:var(--font-display)] tracking-tight">
            8links
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Entre na sua conta</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && error !== "migrate" && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}
            {error === "migrate" && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-3">
                <p className="text-sm font-semibold text-foreground">Migramos para uma nova plataforma!</p>
                <p className="text-xs text-muted-foreground">Crie uma nova senha clicando em <strong>"Esqueceu?"</strong> acima, ou fale com o suporte:</p>
                <a
                  href={`https://wa.me/5511998710302?text=${encodeURIComponent(`Oi! Preciso de ajuda para acessar a 8links. Meu email: ${email || "(seu email)"}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold transition-colors"
                >
                  Falar com suporte no WhatsApp
                </a>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Esqueceu?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Entrando..." : <>Entrar <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Não tem conta?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Criar conta
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground/60 mt-3">
          Problemas para entrar?{" "}
          <a
            href={`https://wa.me/5511998710302?text=${encodeURIComponent("Oi! Não consigo entrar na 8links, preciso de ajuda.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/70 hover:text-primary hover:underline"
          >
            Fale com o suporte
          </a>
        </p>
      </motion.div>
    </div>
  );
}
