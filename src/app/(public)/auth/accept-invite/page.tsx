"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Key } from "lucide-react";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      toast.error("Link de convite inválido");
      router.push("/login");
      return;
    }
    setInviteToken(token);
    setLoading(false);
  }, [searchParams, router]);

  async function handleSetPassword() {
    if (!password || password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      // Verificar o token de invite
      const { data, error } = await supabase.auth.verifyOtp({
        token: inviteToken!,
        type: "invite",
      });

      if (error) {
        console.error("[AcceptInvite] Verify error:", error);
        toast.error("Token de convite inválido ou expirado");
        setSubmitting(false);
        return;
      }

      // Agora que o invite foi verificado, definir a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error("[AcceptInvite] Update password error:", updateError);
        toast.error("Erro ao definir senha");
        setSubmitting(false);
        return;
      }

      toast.success("Senha definida com sucesso! Redirecionando...");

      // Aguardar um pouco e redirecionar
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);

    } catch (err) {
      console.error("[AcceptInvite] Unexpected error:", err);
      toast.error("Erro inesperado. Tente novamente.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Verificando convite...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Key className="w-4 h-4 text-primary-foreground" />
            </div>
            <CardTitle>Definir Senha</CardTitle>
          </div>
          <CardDescription>
            Bem-vindo! Crie sua senha para acessar a plataforma 8links.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSetPassword}
            disabled={submitting || !password || !confirmPassword}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitting ? "Definindo senha..." : "Criar conta e acessar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
