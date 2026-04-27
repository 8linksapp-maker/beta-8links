"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Link as LinkIcon, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

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
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,hsl(24_100%_55%/0.08),transparent_60%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[hsl(35,100%,60%)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_hsl(24_100%_55%/0.2)]">
            <LinkIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight">
            <span className="text-gradient">8</span>links
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Entre na sua conta</p>
        </div>

        <div className="card-beam rounded-2xl border bg-card p-6 relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && error !== "migrate" && (
              <div className="p-3 rounded-lg bg-[hsl(0_80%_60%/0.1)] border border-[hsl(0_80%_60%/0.2)] text-sm text-destructive">
                {error}
              </div>
            )}
            {error === "migrate" && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
                <p className="text-sm font-semibold text-foreground">Migramos para uma nova plataforma!</p>
                <p className="text-xs text-muted-foreground">Clique em <strong>"Esqueceu?"</strong> ao lado da senha para criar uma nova senha e acessar a nova versão do 8links.</p>
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
      </motion.div>
    </div>
  );
}
