"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Link2,
  Globe,
  FileText,
  Download,
  LayoutDashboard,
  Server,
  Key,
  ArrowLeftRight,
  Newspaper,
  ClipboardCheck,
  Map,
  Eye,
  Users,
  HeartPulse,
  Contact,
  BarChart3,
  Crown,
  LifeBuoy,
  Settings,
} from "lucide-react";

const actions = [
  { label: "Criar Backlink", shortcut: "N", icon: Link2 },
  { label: "Adicionar Site", shortcut: "S", icon: Globe },
  { label: "Novo Artigo", shortcut: "A", icon: FileText },
  { label: "Exportar Dados", shortcut: "E", icon: Download },
];

const pages = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Sites", path: "/sites", icon: Server },
  { label: "Keywords", path: "/keywords", icon: Key },
  { label: "Backlinks", path: "/backlinks", icon: ArrowLeftRight },
  { label: "Keyword Planner", path: "/keyword-planner", icon: Key },
  { label: "Artigos", path: "/articles", icon: Newspaper },
  { label: "Content Audit", path: "/content-audit", icon: ClipboardCheck },
  { label: "Topical Map", path: "/topical-map", icon: Map },
  { label: "AI Visibility", path: "/ai-visibility", icon: Eye },
  { label: "Concorrentes", path: "/concorrentes", icon: Users },
  { label: "Saude do Site", path: "/saude-do-site", icon: HeartPulse },
  { label: "CRM", path: "/crm", icon: Contact },
  { label: "Relatorios", path: "/relatorios", icon: BarChart3 },
  { label: "Club", path: "/club", icon: Crown },
  { label: "Suporte", path: "/suporte", icon: LifeBuoy },
  { label: "Configuracoes", path: "/configuracoes", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleAction = (label: string) => {
    setOpen(false);
    toast.success(`${label} iniciado`);
  };

  const handlePage = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <motion.div
            className="relative w-full max-w-lg"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <Command
              className="rounded-xl border border-border-strong bg-card shadow-2xl overflow-hidden"
              label="Command Palette"
            >
              <Command.Input
                placeholder="Buscar acao ou pagina..."
                className="w-full border-b border-border-strong bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado.
                </Command.Empty>

                <Command.Group
                  heading="Acoes Rapidas"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {actions.map((action) => (
                    <Command.Item
                      key={action.label}
                      value={action.label}
                      onSelect={() => handleAction(action.label)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground cursor-pointer data-[selected=true]:bg-muted/50"
                    >
                      <action.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{action.label}</span>
                      <kbd className="ml-auto text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 font-mono">
                        {"\u2318"}
                        {action.shortcut}
                      </kbd>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Separator className="my-1 h-px bg-border-strong" />

                <Command.Group
                  heading="Paginas"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {pages.map((page) => (
                    <Command.Item
                      key={page.path}
                      value={page.label}
                      onSelect={() => handlePage(page.path)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground cursor-pointer data-[selected=true]:bg-muted/50"
                    >
                      <page.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{page.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
