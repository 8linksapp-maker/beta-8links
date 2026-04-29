"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Link as LinkIcon, Lock, CheckCircle2, AlertCircle } from "lucide-react";
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
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if user has a valid session (required for password update)
  // Retry a few times because cookies from the callback may take a moment to propagate
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setCheckingSession(false);
      }
    });

    // Retry session check — cookies from server-side callback may not be available immediately
    const checkSession = async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        if (cancelled) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setCheckingSession(false);
          return;
        }
        // Wait before retrying (200ms, 400ms, 600ms, 800ms)
        if (attempt < 4) await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
      }
      if (!cancelled) {
        setError("Sessão inválida ou expirada. Por favor, solicite um novo link de recuperação.");
        setCheckingSession(false);
      }
    };

    checkSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

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

  // Show loading state while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,hsl(24_100%_55%/0.08),transparent_60%)]" />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm relative text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[hsl(35,100%,60%)] flex items-center justify-center mx-auto mb-4 shadow-[0_0_32px_hsl(24_100%_55%/0.2)]">
            <LinkIcon className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">Verificando sessão...</p>
        </motion.div>
      </div>
    );
  }

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
              <Button className="w-full" onClick={() => router.push("/login")}>
                Fazer login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-[hsl(0_80%_60%/0.1)] border border-[hsl(0_80%_60%/0.2)] text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Only show form fields if there's a valid session */}
              {!error?.includes("Sessão inválida") && (
                <>
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
                </>
              )}

              {/* Show link to request new recovery email if session is invalid */}
              {error?.includes("Sessão inválida") && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/forgot-password")}
                  >
                    Solicitar novo link
                  </Button>
                </div>
              )}
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
