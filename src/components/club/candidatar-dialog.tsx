"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Send, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useSite } from "@/lib/hooks/use-site";
import { useUser } from "@/lib/hooks/use-user";

type Props = {
  open: boolean;
  onClose: () => void;
  session?: {
    id: string;
    scheduled_at: string;
    max_slots: number;
  } | null;
};

export function CandidatarDialog({ open, onClose, session }: Props) {
  const { activeSite } = useSite();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState("");

  const handleSubmit = async () => {
    if (!session || !activeSite || !user) {
      toast.error("Dados incompletos para candidatura");
      return;
    }

    if (!goal.trim()) {
      toast.error("Digite o que você quer receber na análise");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Verificar se já está candidato
      const { data: existing } = await supabase
        .from("club_candidates")
        .select("id")
        .eq("session_id", session.id)
        .eq("client_site_id", activeSite.id)
        .single();

      if (existing) {
        toast.info("Você já está candidato nesta sessão!");
        onClose();
        return;
      }

      // Criar candidatura
      const { error } = await supabase.from("club_candidates").insert({
        session_id: session.id,
        client_site_id: activeSite.id,
        user_id: user.id,
        goal: goal.trim(),
        selected: false,
      });

      if (error) throw error;

      toast.success("Candidatura enviada! Boa sorte.");
      setGoal("");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar candidatura. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGoal("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Candidatar meu site
          </DialogTitle>
          <DialogDescription>
            Envie sua candidatura para a próxima sessão do Club 8links
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {session && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-primary/5 border border-primary/20 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  Sessão disponível
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(session.scheduled_at).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}{" "}
                às {new Date(session.scheduled_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {session.max_slots} vagas disponíveis
              </p>
            </motion.div>
          )}

          <div className="space-y-2">
            <Label htmlFor="goal">
              O que você quer receber na análise? *
            </Label>
            <Textarea
              id="goal"
              placeholder="Ex: Quero feedback sobre a estrutura de backlinks do meu site, ou dicas para melhorar o posicionamento da palavra-chave X..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Seja específico sobre o que deseja aprender
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !goal.trim()}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar candidatura
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
