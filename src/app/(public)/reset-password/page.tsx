"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Link as LinkIcon, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres"); return; }
    if (password !== confirm) { setError("As senhas não coincidem"); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,hsl(24_100%_55%/0.08),transparent_60%)]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[hsl(35,100%,60%)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_hsl(24_100%_55%/0.2)]">
            <LinkIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight">
            {done ? "Senha atualizada!" : "Nova senha"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {done ? "Você já pode acessar a plataforma" : "Defina sua nova senha"}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-6">Sua senha foi atualizada com sucesso.</p>
              <Button className="w-full" onClick={() => router.push("/dashboard")}>
                Acessar plataforma
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-[hsl(0_80%_60%/0.1)] border border-[hsl(0_80%_60%/0.2)] text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label>Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder="Mínimo 6 caracteres" className="pl-9"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder="Repita a senha" className="pl-9"
                    value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Salvando..." : "Definir nova senha"}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
