"use client";

import Link from "next/link";
import { Sparkles, GitBranch } from "lucide-react";
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

type Props = {
  open: boolean;
  onClose: () => void;
  siteUrl: string;
};

const OPTIONS: {
  key: "wordpress" | "github";
  title: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  href: string;
}[] = [
  {
    key: "wordpress",
    title: "WordPress",
    hint: "Site comum, blog, loja. Publica direto.",
    icon: Sparkles,
    iconBg: "bg-success-light text-success",
    href: "/integracoes?open=wordpress",
  },
  {
    key: "github",
    title: "GitHub",
    hint: "Site estático (Astro, Hugo, Next.js). Avançado.",
    icon: GitBranch,
    iconBg: "bg-muted text-muted-foreground",
    href: "/integracoes?open=github",
  },
];

export function NoIntegrationDialog({ open, onClose, siteUrl }: Props) {
  const cleanUrl = (siteUrl ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Conecte uma integração primeiro</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Pra publicar artigos em{" "}
            <strong className="text-foreground font-mono">{cleanUrl}</strong>, conecte WordPress ou GitHub.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {OPTIONS.map((opt) => (
            <motion.div
              key={opt.key}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href={opt.href}
                onClick={onClose}
                className="flex flex-col items-center text-center gap-2 p-5 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-colors h-full"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${opt.iconBg}`}>
                  <opt.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold">Conectar {opt.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{opt.hint}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
