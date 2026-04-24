"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import {
  Key,
  RefreshCw,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusTag } from "@/components/ui/status-tag";
import { Button } from "@/components/ui/button";

const API_PROVIDERS = [
  {
    id: 1,
    name: "DataForSEO",
    description: "Dados de SEO, backlinks e SERP",
    connected: true,
    maskedKey: "••••••••dk8f3x",
    monthlyCost: "R$ 420,00",
    lastUsed: "13 Abr, 14:58",
  },
  {
    id: 2,
    name: "OpenAI",
    description: "Geracao de artigos e conteudo",
    connected: true,
    maskedKey: "••••••••sk-7nQ",
    monthlyCost: "R$ 890,00",
    lastUsed: "13 Abr, 15:02",
  },
  {
    id: 3,
    name: "Perplexity",
    description: "Pesquisa e verificacao de fatos",
    connected: true,
    maskedKey: "••••••••px-m4k",
    monthlyCost: "R$ 150,00",
    lastUsed: "13 Abr, 12:30",
  },
  {
    id: 4,
    name: "Gemini",
    description: "Analise e processamento de dados",
    connected: true,
    maskedKey: "••••••••gm-r2d",
    monthlyCost: "R$ 210,00",
    lastUsed: "12 Abr, 18:45",
  },
  {
    id: 5,
    name: "Claude",
    description: "Bot de suporte e analises",
    connected: true,
    maskedKey: "••••••••cl-9xz",
    monthlyCost: "R$ 340,00",
    lastUsed: "13 Abr, 14:22",
  },
  {
    id: 6,
    name: "Stripe",
    description: "Pagamentos e assinaturas",
    connected: true,
    maskedKey: "••••••••sk_live",
    monthlyCost: "R$ 78,00",
    lastUsed: "13 Abr, 15:10",
  },
  {
    id: 7,
    name: "Evolution API",
    description: "Integracoes WhatsApp",
    connected: false,
    maskedKey: "-",
    monthlyCost: "-",
    lastUsed: "-",
  },
];

export default function ApiKeysPage() {
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
          <h1 className="page-title">Chaves de API</h1>
          <p className="page-description">Gerencie integracao com provedores externos</p>
        </div>
      </motion.div>

      {/* Provider Cards */}
      <div className="space-y-4">
        {API_PROVIDERS.map((provider, i) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 + i * 0.04 }}
          >
            <Card className="card-interactive hover:border-primary/30">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: provider info */}
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary-light flex items-center justify-center ring-1 ring-primary/20 shrink-0">
                      <Key className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold font-[family-name:var(--font-display)]">{provider.name}</h3>
                        {provider.connected ? (
                          <StatusTag status="active" label="Conectado" />
                        ) : (
                          <StatusTag status="error" label="Desconectado" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                    </div>
                  </div>

                  {/* Right: details + action */}
                  <div className="flex items-center gap-6 sm:gap-8">
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-muted-foreground">Chave</p>
                      <p className="text-sm font-mono">{provider.maskedKey}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-muted-foreground">Custo Mensal</p>
                      <p className="text-sm font-mono font-semibold">{provider.monthlyCost}</p>
                    </div>
                    <div className="text-right hidden lg:block">
                      <p className="text-xs text-muted-foreground">Ultimo Uso</p>
                      <p className="text-xs font-mono text-muted-foreground">{provider.lastUsed}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Atualizar
                    </Button>
                  </div>
                </div>

                {/* Mobile details */}
                <div className="flex gap-6 mt-3 md:hidden text-xs">
                  <div>
                    <span className="text-muted-foreground">Chave: </span>
                    <span className="font-mono">{provider.maskedKey}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Custo: </span>
                    <span className="font-mono font-semibold">{provider.monthlyCost}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
