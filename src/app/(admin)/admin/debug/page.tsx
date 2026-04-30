"use client";

import { useState, useRef } from "react";
import { Loader2, Play, ChevronDown, ChevronRight, Copy, Check, Bug } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Step {
  step: string;
  status: "running" | "done" | "error";
  duration?: number;
  data?: any;
}

interface DebugResult {
  keyword: string;
  model: string;
  outline: any;
  article: string;
  nlpTerms: any[];
  guidelines: any;
  stats: any;
  steps: any[];
  competitorOutlines: any[];
}

export default function DebugPage() {
  const [keyword, setKeyword] = useState("como ganhar dinheiro na internet");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["prompt-outline", "prompt-article", "article"]));
  const [copied, setCopied] = useState("");

  const toggle = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const run = async () => {
    setRunning(true);
    setResult(null);
    setSteps([
      { step: "1. SERP Analysis", status: "running" },
      { step: "2. Scrape concorrentes", status: "running" },
      { step: "3. Gerar outline (GPT)", status: "running" },
      { step: "4. Escrever artigo (GPT)", status: "running" },
      { step: "5. Buscar imagens", status: "running" },
    ]);

    try {
      const res = await fetch("/api/admin/test-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), model: "gpt-4.1-mini" }),
      });
      const data = await res.json();

      // Map API steps to our steps
      const apiSteps = data.steps ?? [];
      setSteps(apiSteps.map((s: any) => ({
        step: s.step,
        status: s.data?.error ? "error" : "done",
        duration: s.duration,
        data: s.data,
      })));

      setResult(data);
    } catch (err: any) {
      setSteps(prev => prev.map(s => s.status === "running" ? { ...s, status: "error" as const } : s));
    }
    setRunning(false);
  };

  // Reconstruct prompts from the result data
  const outlinePrompt = result ? buildOutlinePrompt(keyword, result.competitorOutlines, result.guidelines) : "";
  const articlePrompt = result ? buildArticlePrompt(keyword, result.outline, result.guidelines) : "";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-[family-name:var(--font-display)]">Debug: Gerador de Artigos</h1>
        <p className="text-sm text-muted-foreground mt-1">Analise cada etapa do pipeline de geração</p>
      </div>

      {/* Sentry test */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bug className="w-4 h-4" />
            <span>Teste de captura do Sentry — dispara um erro proposital pra validar a integração</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                const msg = `Sentry client test #${Math.floor(Math.random() * 100000)} em ${new Date().toISOString()}`;
                Sentry.captureException(new Error(msg));
                toast.success("Erro client-side enviado. Confira no Slack #alerts em ~30s.");
              }}
            >
              Disparar erro (client)
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={async () => {
                try {
                  const res = await fetch("/api/admin/sentry-test");
                  if (!res.ok) toast.success("Erro server-side enviado. Confira no dashboard do Sentry.");
                  else toast.error("Esperava-se erro mas API retornou OK — verifique o route.");
                } catch {
                  toast.success("Erro server-side enviado. Confira no dashboard do Sentry.");
                }
              }}
            >
              Disparar erro (server)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Input */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={e => { e.preventDefault(); run(); }} className="flex gap-3">
            <Input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Keyword para testar..."
              className="flex-1"
              disabled={running}
            />
            <Button type="submit" disabled={running || !keyword.trim()} className="gap-2 min-w-[140px]">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "Gerando..." : "Executar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Steps timeline */}
      {steps.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-bold mb-3">Pipeline</h2>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    s.status === "done" ? "bg-success/20 text-success" :
                    s.status === "error" ? "bg-destructive/20 text-destructive" :
                    "bg-primary/20 text-primary"
                  }`}>
                    {s.status === "running" ? <Loader2 className="w-3 h-3 animate-spin" /> :
                     s.status === "error" ? "!" : "✓"}
                  </div>
                  <span className="text-sm font-medium flex-1">{s.step}</span>
                  {s.duration !== undefined && (
                    <span className="text-[10px] font-mono text-muted-foreground">{(s.duration / 1000).toFixed(1)}s</span>
                  )}
                  {s.data?.error && (
                    <Badge variant="error" className="text-[9px]">erro</Badge>
                  )}
                </div>
              ))}
            </div>
            {result?.stats && (
              <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-4 text-xs">
                <Stat label="Tempo total" value={result.stats.totalDuration} />
                <Stat label="Palavras" value={result.stats.wordCount} />
                <Stat label="Input tokens" value={result.stats.inputTokens?.toLocaleString()} />
                <Stat label="Output tokens" value={result.stats.outputTokens?.toLocaleString()} />
                <Stat label="Custo" value={result.stats.cost} />
                <Stat label="Custo BRL" value={result.stats.costBRL} />
                <Stat label="Modelo" value={result.stats.model} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Step 1+2: Competitors */}
          <CollapsibleSection
            title="1-2. Análise de concorrentes"
            subtitle={`${result.competitorOutlines?.length ?? 0} concorrentes analisados`}
            expanded={expandedSections.has("competitors")}
            onToggle={() => toggle("competitors")}
          >
            <div className="space-y-4">
              {/* Word count comparison */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Contagem de palavras</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {result.competitorOutlines?.map((c: any, i: number) => (
                    <div key={i} className="p-2 rounded-lg bg-muted/30 text-xs">
                      <p className="font-mono text-muted-foreground truncate">{c.url?.replace(/^https?:\/\/([^/]+).*/, '$1')}</p>
                      <p className="font-bold font-mono mt-0.5">{c.wordCount?.toLocaleString()} palavras</p>
                    </div>
                  ))}
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                    <p className="text-primary font-semibold">Meta (avg +20%)</p>
                    <p className="font-bold font-mono mt-0.5">{result.guidelines?.wordCountTarget?.toLocaleString()} palavras</p>
                  </div>
                </div>
              </div>

              {/* Each competitor headings */}
              {result.competitorOutlines?.map((c: any, i: number) => (
                <div key={i} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold">{c.title || c.url}</p>
                    <Badge variant="outline" className="text-[9px]">{c.headings?.length} headings | {c.wordCount} words</Badge>
                  </div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {c.headings?.map((h: any, j: number) => (
                      <p key={j} className={`text-[11px] font-mono ${h.level === "h1" ? "font-bold" : h.level === "h2" ? "pl-2" : h.level === "h3" ? "pl-6 text-muted-foreground" : "pl-10 text-muted-foreground/60"}`}>
                        <span className="text-primary/50 mr-1">[{h.level}]</span> {h.text}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Step 3: Outline Prompt */}
          <CollapsibleSection
            title="3. Prompt da Outline"
            subtitle="Prompt enviado ao GPT para gerar a estrutura"
            expanded={expandedSections.has("prompt-outline")}
            onToggle={() => toggle("prompt-outline")}
          >
            <div className="relative">
              <CopyButton text={outlinePrompt} id="outline-prompt" copied={copied} onCopy={copyText} />
              <pre className="text-[11px] font-mono bg-muted/30 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed">{outlinePrompt}</pre>
            </div>
          </CollapsibleSection>

          {/* Step 3 result: Outline */}
          <CollapsibleSection
            title="3b. Resultado da Outline"
            subtitle={`${result.outline?.outline?.length ?? 0} headings | ${result.outline?.faq?.length ?? 0} FAQs | ${result.outline?.nlpTerms?.length ?? 0} NLP terms`}
            expanded={expandedSections.has("outline-result")}
            onToggle={() => toggle("outline-result")}
          >
            <div className="space-y-4">
              {/* Title + Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Title</p>
                  <p className="text-sm font-bold">{result.outline?.title}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Meta Description</p>
                  <p className="text-xs">{result.outline?.metaDescription}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">{result.outline?.metaDescription?.length} chars</p>
                </div>
              </div>

              {/* Outline structure */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Estrutura</h4>
                <div className="space-y-0.5">
                  {result.outline?.outline?.map((h: any, i: number) => (
                    <p key={i} className={`text-[12px] font-mono ${h.level === "h2" ? "font-bold mt-2" : "pl-4 text-muted-foreground"}`}>
                      <span className="text-primary/50 mr-1">{h.level === "h2" ? "##" : "###"}</span> {h.text}
                    </p>
                  ))}
                </div>
              </div>

              {/* FAQ */}
              {result.outline?.faq?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">FAQ ({result.outline.faq.length})</h4>
                  <div className="space-y-2">
                    {result.outline.faq.map((f: any, i: number) => (
                      <div key={i} className="p-2 rounded-lg bg-muted/20">
                        <p className="text-xs font-bold">{f.question}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{f.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NLP Terms */}
              {result.nlpTerms?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">NLP Terms ({result.nlpTerms.length})</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.nlpTerms.map((t: any, i: number) => {
                      // Count occurrences in article
                      const count = result.article
                        ? (result.article.toLowerCase().match(new RegExp(t.term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
                        : 0;
                      const inRange = count >= t.min && count <= t.max;
                      const missing = count === 0;
                      return (
                        <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border ${
                          missing ? "border-destructive/30 bg-destructive/5 text-destructive" :
                          inRange ? "border-success/30 bg-success/5 text-success" :
                          "border-warning/30 bg-warning/5 text-warning"
                        }`}>
                          {t.term}
                          <span className="font-bold">{count}</span>
                          <span className="opacity-50">/{t.min}-{t.max}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Step 4: Article Prompt */}
          <CollapsibleSection
            title="4. Prompt do Artigo"
            subtitle="Prompt enviado ao GPT para escrever o artigo"
            expanded={expandedSections.has("prompt-article")}
            onToggle={() => toggle("prompt-article")}
          >
            <div className="relative">
              <CopyButton text={articlePrompt} id="article-prompt" copied={copied} onCopy={copyText} />
              <pre className="text-[11px] font-mono bg-muted/30 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed">{articlePrompt}</pre>
            </div>
          </CollapsibleSection>

          {/* Step 4 result: Article */}
          <CollapsibleSection
            title="4b. Artigo Gerado"
            subtitle={`${result.stats?.wordCount ?? 0} palavras | meta: ${result.guidelines?.wordCountTarget ?? 0}`}
            expanded={expandedSections.has("article")}
            onToggle={() => toggle("article")}
          >
            <div className="space-y-4">
              {/* Word count bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden relative">
                  <div
                    className={`h-full rounded-full ${
                      result.stats?.wordCount >= result.guidelines?.wordCountTarget * 0.9 ? "bg-success" : "bg-warning"
                    }`}
                    style={{ width: `${Math.min(100, (result.stats?.wordCount / result.guidelines?.wordCountTarget) * 100)}%` }}
                  />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/30" style={{ left: "100%" }} />
                </div>
                <span className="text-xs font-mono font-bold shrink-0">
                  {result.stats?.wordCount} / {result.guidelines?.wordCountTarget}
                </span>
              </div>

              {/* Article content */}
              <div className="relative">
                <CopyButton text={result.article} id="article" copied={copied} onCopy={copyText} />
                <div className="prose prose-invert prose-sm max-w-none p-4 rounded-lg bg-muted/20 max-h-[600px] overflow-y-auto">
                  <pre className="text-[12px] font-mono whitespace-pre-wrap leading-relaxed">{result.article}</pre>
                </div>
              </div>

              {/* Heading structure from article */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Estrutura detectada no artigo</h4>
                <div className="space-y-0.5">
                  {result.article?.split("\n").filter((l: string) => l.startsWith("#")).map((l: string, i: number) => {
                    const level = l.match(/^(#+)/)?.[1]?.length ?? 0;
                    return (
                      <p key={i} className={`text-[11px] font-mono ${level === 1 ? "font-bold" : level === 2 ? "font-bold pl-0 mt-1" : "pl-4 text-muted-foreground"}`}>
                        {l}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Raw JSON */}
          <CollapsibleSection
            title="JSON Completo"
            subtitle="Resposta bruta da API"
            expanded={expandedSections.has("raw")}
            onToggle={() => toggle("raw")}
          >
            <div className="relative">
              <CopyButton text={JSON.stringify(result, null, 2)} id="raw" copied={copied} onCopy={copyText} />
              <pre className="text-[10px] font-mono bg-muted/30 p-4 rounded-lg overflow-x-auto max-h-[500px] overflow-y-auto whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </CollapsibleSection>
        </>
      )}
    </div>
  );
}

// ─── Helper components ──────────────────────────────

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-mono font-bold text-sm">{value}</p>
    </div>
  );
}

function CollapsibleSection({ title, subtitle, expanded, onToggle, children }: {
  title: string; subtitle?: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <Card>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-muted/20 transition-colors">
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">{title}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </button>
      {expanded && <CardContent className="px-4 pb-4 pt-0">{children}</CardContent>}
    </Card>
  );
}

function CopyButton({ text, id, copied, onCopy }: { text: string; id: string; copied: string; onCopy: (text: string, id: string) => void }) {
  return (
    <button
      onClick={() => onCopy(text, id)}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer z-10"
    >
      {copied === id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Prompt reconstruction ──────────────────────────

function buildOutlinePrompt(keyword: string, competitors: any[], guidelines: any) {
  const avgWords = guidelines?.avgCompetitorWords ?? 1500;
  const targetWords = guidelines?.wordCountTarget ?? 1800;

  return `Sou um redator SEO. Preciso criar a MELHOR outline (estrutura) pra um artigo sobre "${keyword}".

Analisei os top 5 resultados do Google e extraí os headings de cada um:

${(competitors ?? []).map((c: any, i: number) => `--- Resultado ${i + 1}: ${c.title} (${c.wordCount} palavras) ---\n${(c.headings ?? []).map((h: any) => `[${h.level}] ${h.text}`).join("\n")}`).join("\n\n")}

Com base nesses headings, crie UMA outline consolidada que:
1. Cubra TODOS os tópicos importantes (não deixe nenhum de fora)
2. Elimine repetições e sinônimos
3. Organize de forma semântica e lógica (do básico ao avançado)
4. Adicione 2-3 tópicos que os concorrentes NÃO cobriram (diferencial)
5. Use H2 e H3 de forma hierárquica
6. Inclua uma FAQ no final com 5 perguntas frequentes

REGRA DO TÍTULO: o "title" DEVE conter a keyword "${keyword}" de forma natural. A keyword deve aparecer preferencialmente no início do título.

TAMBÉM extraia os TERMOS NLP mais importantes do nicho "${keyword}". Esses são palavras/frases semanticamente relacionadas que o Google espera ver num artigo sobre esse tema. Para cada termo, indique quantas vezes deveria aparecer no artigo.

Retorne APENAS um JSON válido com as chaves:
- "title" (string com a keyword incluída)
- "metaDescription" (string 150-160 chars com a keyword)
- "outline" (array de objetos com "level" h2 ou h3 e "text")
- "faq" (array de objetos com "question" e "answer")
- "wordCountTarget" (number)
- "nlpTerms" (array de objetos com "term" string e "min" number e "max" number — frequência recomendada)

Para os nlpTerms: inclua 15-20 termos. Ex: para "marketing digital" → [{"term":"redes sociais","min":2,"max":5},{"term":"SEO","min":3,"max":7},...].

O wordCountTarget deve ser ${targetWords} (média dos concorrentes ${avgWords} + 20%).

Não use "..." ou comentários dentro do JSON. Retorne o JSON completo e válido.`;
}

function buildArticlePrompt(keyword: string, outline: any, guidelines: any) {
  if (!outline) return "(outline não disponível)";

  const targetWordCount = guidelines?.wordCountTarget ?? 1800;
  const avgCompetitorWords = guidelines?.avgCompetitorWords ?? 1500;
  const h2Count = outline.outline?.filter((h: any) => h.level === "h2").length ?? 1;
  const faqWords = (outline.faq?.length ?? 0) * 40;
  const availableWords = targetWordCount - faqWords;
  const wordsPerH2 = Math.round(availableWords / Math.max(h2Count, 1));

  const outlineWithTargets = (outline.outline ?? []).map((h: any) => {
    if (h.level === "h2") {
      const isFaq = h.text.toLowerCase().includes("faq") || h.text.toLowerCase().includes("perguntas");
      return `## ${h.text} ${isFaq ? "(~" + faqWords + " palavras)" : "(~" + wordsPerH2 + " palavras)"}`;
    }
    return `### ${h.text}`;
  }).join("\n");

  return `Escreva um artigo completo em português brasileiro sobre "${keyword}".

TÍTULO: ${outline.title}

TOTAL DO ARTIGO: ${targetWordCount} palavras (média dos concorrentes: ${avgCompetitorWords} palavras + 20%)

OUTLINE — siga esta estrutura e RESPEITE o tamanho indicado em cada seção:
${outlineWithTargets}

FAQ (OBRIGATÓRIO — use ### para cada pergunta):
${(outline.faq ?? []).map((f: any) => `### ${f.question}\n${f.answer}`).join("\n\n")}

REGRAS DE TAMANHO:
- Cada seção H2 deve ter EXATAMENTE o número de palavras indicado entre parênteses. Isso é CRÍTICO.
- Total do artigo: ${targetWordCount} palavras.

REGRAS DE FORMATAÇÃO (OBRIGATÓRIAS):
- Um parágrafo = 2 a 3 frases JUNTAS (separadas por ponto, na MESMA linha)
- Separe parágrafos com UMA linha em branco
- Cada parágrafo deve ter no máximo 3 frases
- NÃO coloque cada frase em uma linha separada — agrupe 2-3 frases por parágrafo
- NÃO escreva blocos com mais de 4 linhas seguidas
- As perguntas do FAQ devem ser formatadas como ### (H3)

REGRAS DE ESCRITA:
- Português brasileiro natural, não "português de Portugal"
- Tom: informativo e acessível, como se explicasse pra um amigo
- Use dados, números e exemplos concretos quando possível
- FAQ: responda cada pergunta em 2-3 frases
- NÃO use frases genéricas tipo "neste artigo vamos explorar" ou "é importante ressaltar"
- NÃO comece com "Você já se perguntou"
- Escreva em formato Markdown
- Comece direto com o conteúdo, sem repetir o título`;
}
