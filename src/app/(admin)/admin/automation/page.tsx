"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import {
  Settings,
  Shuffle,
  Type,
  GitMerge,
  Bot,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface AutomationConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  settings: { label: string; value: string }[];
  toggles?: { label: string; checked: boolean }[];
}

const initialConfigs: AutomationConfig[] = [
  {
    id: "distribution",
    title: "Regras de Distribuicao de Backlinks",
    description: "Controle como os backlinks sao distribuidos entre os sites da rede",
    icon: Shuffle,
    enabled: true,
    settings: [
      { label: "Max backlinks/site/dia", value: "3" },
      { label: "Intervalo minimo entre publicacoes", value: "4 horas" },
      { label: "Prioridade por DA", value: "Ativado" },
    ],
    toggles: [
      { label: "Distribuicao automatica", checked: true },
      { label: "Balanceamento por nicho", checked: true },
      { label: "Respeitar limite do plano", checked: true },
    ],
  },
  {
    id: "anchor",
    title: "Variacao de Anchor Text",
    description: "Configure a diversificacao automatica de textos-ancora",
    icon: Type,
    enabled: true,
    settings: [
      { label: "Exact match", value: "15%" },
      { label: "Partial match", value: "30%" },
      { label: "Branded", value: "25%" },
      { label: "Generic", value: "20%" },
      { label: "URL nua", value: "10%" },
    ],
    toggles: [
      { label: "Variacao automatica", checked: true },
      { label: "Alertar se exact match > 20%", checked: true },
    ],
  },
  {
    id: "matching",
    title: "Regras de Matching",
    description: "Defina como sites parceiros sao combinados com clientes",
    icon: GitMerge,
    enabled: true,
    settings: [
      { label: "Relevancia tematica minima", value: "70%" },
      { label: "AP minimo do parceiro", value: "25" },
      { label: "Max backlinks do mesmo dominio", value: "2/mes" },
    ],
    toggles: [
      { label: "Matching automatico por nicho", checked: true },
      { label: "Excluir dominios duplicados", checked: true },
      { label: "Permitir cross-niche", checked: false },
    ],
  },
  {
    id: "bot",
    title: "Prompts do Bot de Suporte",
    description: "Configure o comportamento e respostas do bot de atendimento",
    icon: Bot,
    enabled: true,
    settings: [
      { label: "Modelo IA", value: "GPT-4o" },
      { label: "Temperatura", value: "0.3" },
      { label: "Max tokens resposta", value: "500" },
      { label: "Idioma", value: "Portugues (BR)" },
    ],
    toggles: [
      { label: "Bot ativo", checked: true },
      { label: "Escalar para humano se CSAT < 3", checked: true },
      { label: "Coletar feedback apos resolucao", checked: true },
    ],
  },
];

export default function AutomationPage() {
  const [configs, setConfigs] = useState(initialConfigs);

  const handleToggle = (configId: string, toggleIndex: number) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === configId
          ? {
              ...c,
              toggles: c.toggles?.map((t, i) =>
                i === toggleIndex ? { ...t, checked: !t.checked } : t
              ),
            }
          : c
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title">Automacao</h1>
          <p className="page-description">Configure regras e comportamentos automaticos da plataforma</p>
        </div>
      </motion.div>

      {/* Config Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {configs.map((config, i) => (
          <motion.div
            key={config.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 + i * 0.05 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary-light flex items-center justify-center ring-1 ring-primary/20">
                      <config.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{config.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current settings */}
                <div className="space-y-2">
                  {config.settings.map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-mono font-semibold text-xs">{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* Toggles */}
                {config.toggles && (
                  <div className="border-t border-border pt-4 space-y-3">
                    {config.toggles.map((toggle, ti) => (
                      <div key={toggle.label} className="flex items-center justify-between">
                        <span className="text-sm">{toggle.label}</span>
                        <Switch
                          checked={toggle.checked}
                          onCheckedChange={() => handleToggle(config.id, ti)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
