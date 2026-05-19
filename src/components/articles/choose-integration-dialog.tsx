"use client";

import { useState } from "react";
import { Sparkles, GitBranch, Send, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Via = "wordpress" | "github";

type Props = {
  open: boolean;
  onClose: () => void;
  onChoose: (via: Via) => void;
  publishing?: boolean;
};

const OPTIONS: {
  via: Via;
  title: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
}[] = [
  {
    via: "wordpress",
    title: "WordPress",
    hint: "Publica direto no site, vivo em segundos.",
    icon: Sparkles,
    iconBg: "bg-success-light text-success",
  },
  {
    via: "github",
    title: "GitHub",
    hint: "Commit no seu repo. Site atualiza em 2-5min após o deploy.",
    icon: GitBranch,
    iconBg: "bg-muted text-muted-foreground",
  },
];

export function ChooseIntegrationDialog({ open, onClose, onChoose, publishing = false }: Props) {
  const [picked, setPicked] = useState<Via | null>(null);

  const handleClose = () => {
    if (publishing) return;
    setPicked(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!picked || publishing) return;
    onChoose(picked);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Onde você quer publicar?</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Esse site está conectado tanto ao WordPress quanto ao GitHub. Escolha onde o artigo vai.
          </DialogDescription>
        </DialogHeader>

        <div
          role="radiogroup"
          aria-label="Escolha a integração"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2"
        >
          {OPTIONS.map((opt) => {
            const isPicked = picked === opt.via;
            return (
              <motion.button
                key={opt.via}
                type="button"
                role="radio"
                aria-checked={isPicked}
                onClick={() => setPicked(opt.via)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`flex flex-col items-center text-center gap-2 p-5 rounded-xl border-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isPicked
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${opt.iconBg}`}>
                  <opt.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold">{opt.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{opt.hint}</p>
              </motion.button>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-row">
          <Button variant="ghost" onClick={handleClose} disabled={publishing}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!picked || publishing}
            className="gap-1.5 ml-auto"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
