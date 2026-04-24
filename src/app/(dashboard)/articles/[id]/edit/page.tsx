"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft, Bold, Italic, Heading2, Heading3, List, ImagePlus,
  Save, Globe, Check, AlertTriangle, X, Search, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_TITLE = "10 Melhores Notebooks Gamer em 2026";

const MOCK_CONTENT = `<h2>Introdução: Por que escolher um notebook gamer em 2026?</h2>
<p>Com o avanço constante da tecnologia, os notebooks gamer se tornaram verdadeiras potências portáteis. Em 2026, a linha entre desktops e notebooks gamers ficou ainda mais tênue, com processadores de última geração e placas de vídeo que rivalizam com os melhores desktops do mercado.</p>
<p>Se você está buscando o melhor notebook gamer para suas necessidades, este guia completo vai te ajudar a fazer a escolha certa. Analisamos dezenas de modelos e selecionamos os 10 melhores com base em desempenho, custo-benefício e qualidade de construção.</p>

<h2>Como escolhemos os melhores notebooks gamer</h2>
<p>Nossa metodologia de avaliação considera múltiplos fatores: desempenho em benchmarks, qualidade da tela, sistema de refrigeração, autonomia de bateria, design e, claro, o preço. Cada notebook gamer foi testado extensivamente com jogos populares como Cyberpunk 2077, Elden Ring e Starfield.</p>

<h3>Critérios de avaliação</h3>
<p>Para garantir uma análise justa, utilizamos os seguintes critérios:</p>
<ul>
<li>Desempenho em jogos AAA (peso 30%)</li>
<li>Qualidade da tela e taxa de atualização (peso 20%)</li>
<li>Sistema de refrigeração e ruído (peso 15%)</li>
<li>Custo-benefício (peso 20%)</li>
<li>Build quality e design (peso 15%)</li>
</ul>

<h2>1. ASUS ROG Strix G18 (2026)</h2>
<p>O ASUS ROG Strix G18 continua dominando o mercado de notebooks gamer em 2026. Com o processador Intel Core Ultra 9 285HX e a NVIDIA GeForce RTX 5080, este notebook gamer entrega desempenho excepcional em qualquer jogo do mercado.</p>
<p>A tela de 18 polegadas QHD+ com taxa de 240Hz oferece uma experiência visual impressionante. O sistema de refrigeração com câmara de vapor mantém as temperaturas sob controle mesmo em sessões prolongadas.</p>

<h2>2. Lenovo Legion Pro 7i Gen 10</h2>
<p>A Lenovo acertou em cheio com o Legion Pro 7i Gen 10. Este notebook gamer combina o AMD Ryzen 9 9955HX com a RTX 5070 Ti, oferecendo um equilíbrio perfeito entre desempenho e eficiência energética.</p>

<h3>Especificações técnicas</h3>
<p>O destaque fica por conta da tela Mini-LED de 16 polegadas com resolução 2560x1600 e cobertura de 100% DCI-P3. Para quem busca um notebook gamer com tela de qualidade profissional, este é imbatível.</p>

<h2>3. MSI Titan 18 HX (2026)</h2>
<p>O MSI Titan 18 HX é para quem não aceita compromissos. Com a RTX 5090 e 64GB de RAM DDR5, este é o notebook gamer mais poderoso da nossa lista. O preço é salgado, mas o desempenho justifica cada centavo.</p>

<h2>4. Razer Blade 16 (2026)</h2>
<p>A Razer continua oferecendo o notebook gamer mais elegante do mercado. O Blade 16 de 2026 traz um chassi de alumínio CNC que é fino e leve o suficiente para uso profissional, sem sacrificar o desempenho em jogos.</p>

<h2>Comparativo de preços</h2>
<p>Os preços dos notebooks gamer variam significativamente dependendo das configurações escolhidas. Preparamos uma tabela comparativa com os preços médios encontrados nas principais lojas online do Brasil.</p>

<h2>Qual notebook gamer escolher?</h2>
<p>A escolha do melhor notebook gamer depende do seu orçamento e necessidades específicas. Para a maioria dos gamers, o Lenovo Legion Pro 7i oferece o melhor custo-benefício. Para quem busca o máximo desempenho sem se preocupar com preço, o MSI Titan 18 HX é imbatível.</p>

<h2>Conclusão</h2>
<p>O mercado de notebooks gamer em 2026 está mais competitivo do que nunca. Com tantas opções excelentes, o mais importante é definir suas prioridades e escolher o modelo que melhor atende às suas necessidades. Independente da sua escolha, qualquer um dos notebooks gamer desta lista vai te proporcionar uma experiência de jogo incrível.</p>`;

const MOCK_KEYWORDS = [
  { term: "notebook gamer", count: 14, min: 10, max: 18, status: "good" as const },
  { term: "melhor notebook gamer", count: 5, min: 4, max: 7, status: "good" as const },
  { term: "notebooks gamer 2026", count: 3, min: 3, max: 6, status: "good" as const },
  { term: "notebook para jogos", count: 2, min: 3, max: 5, status: "warning" as const },
  { term: "placa de vídeo", count: 1, min: 2, max: 4, status: "warning" as const },
  { term: "RTX 5080", count: 1, min: 1, max: 3, status: "good" as const },
  { term: "custo-benefício", count: 2, min: 2, max: 4, status: "good" as const },
  { term: "taxa de atualização", count: 1, min: 1, max: 3, status: "good" as const },
];

const MOCK_NLP_TERMS = [
  { term: "desempenho em jogos", found: true },
  { term: "sistema de refrigeração", found: true },
  { term: "autonomia de bateria", found: true },
  { term: "resolução de tela", found: false },
  { term: "memória RAM DDR5", found: true },
  { term: "armazenamento SSD NVMe", found: false },
];

const MOCK_COMPETITORS = [
  { name: "Seu artigo", score: 78, isUser: true },
  { name: "#1 techtudo", score: 85, isUser: false },
  { name: "#2 tecnoblog", score: 72, isUser: false },
  { name: "#3 canaltech", score: 68, isUser: false },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countWords(html: string) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? "hsl(152, 60%, 48%)"
      : score >= 60
        ? "hsl(40, 95%, 55%)"
        : "hsl(20, 90%, 52%)";

  const bgColor =
    score >= 80
      ? "hsl(152, 60%, 48%, 0.12)"
      : score >= 60
        ? "hsl(40, 95%, 55%, 0.12)"
        : "hsl(20, 90%, 52%, 0.12)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${bgColor})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-black font-[family-name:var(--font-display)] tracking-tight"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          / 100
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ArticleEditorPage() {
  const params = useParams();
  const _id = params.id;

  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(() => countWords(MOCK_CONTENT));
  const [contentScore] = useState(78);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      setWordCount(countWords(editorRef.current.innerHTML));
    }
  }, []);

  // Set initial content
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = MOCK_CONTENT;
    }
  }, []);

  const toolbarButtons = [
    { icon: Bold, label: "Bold" },
    { icon: Italic, label: "Italic" },
    { icon: Heading2, label: "H2" },
    { icon: Heading3, label: "H3" },
    { icon: List, label: "Lista" },
    { icon: ImagePlus, label: "Imagem" },
  ];

  return (
    <div className="flex gap-6 items-start min-h-[calc(100vh-4rem)]">
      {/* ---------------------------------------------------------------- */}
      {/* LEFT — Editor */}
      {/* ---------------------------------------------------------------- */}
      <motion.div
        className="flex-1 min-w-0 space-y-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/articles">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{MOCK_TITLE}</h1>
            <p className="text-xs text-muted-foreground font-mono">
              Keyword: melhor notebook gamer
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <Card className="p-0">
          <div className="flex items-center gap-1 px-3 py-2">
            {toolbarButtons.map((btn) => (
              <button
                key={btn.label}
                title={btn.label}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <btn.icon className="w-4 h-4" />
              </button>
            ))}
            <Separator orientation="vertical" className="mx-2 h-5" />
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">IA</span>
            </button>
          </div>
        </Card>

        {/* Editor area */}
        <Card className="p-0 overflow-hidden">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            className="min-h-[60vh] p-6 prose prose-invert prose-sm max-w-none
              focus:outline-none
              [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-foreground
              [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground/90
              [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_p]:mb-3
              [&_ul]:text-sm [&_ul]:text-muted-foreground [&_ul]:mb-3 [&_ul]:pl-5
              [&_li]:mb-1"
            spellCheck={false}
          />
        </Card>

        {/* Bottom bar */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">
            {wordCount.toLocaleString()} palavras
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Save className="w-3.5 h-3.5" />
              Salvar Rascunho
            </Button>
            <Button size="sm">
              <Globe className="w-3.5 h-3.5" />
              Publicar no WordPress
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ---------------------------------------------------------------- */}
      {/* RIGHT — Content Score Panel */}
      {/* ---------------------------------------------------------------- */}
      <motion.aside
        className="w-80 shrink-0 sticky top-0 space-y-4 max-h-screen overflow-y-auto pb-6 scrollbar-thin"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {/* Score ring */}
        <Card className="p-5">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Content Score
            </span>
            <ScoreRing score={contentScore} />
            <Badge variant="warning" className="text-[10px] mt-1">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Quase lá! Otimize mais.
            </Badge>
          </div>
        </Card>

        {/* Stats */}
        <Card className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Estatísticas
          </h3>
          {[
            { label: "Palavras", value: `${wordCount.toLocaleString()} / 2.340`, ok: wordCount >= 2000 },
            { label: "Headings", value: "11 / 12", ok: true },
            { label: "Imagens", value: "4 / 6", ok: false },
            { label: "Parágrafos", value: "18", ok: true },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold">{stat.value}</span>
                {stat.ok ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                )}
              </div>
            </div>
          ))}
        </Card>

        {/* Keywords */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Termos-chave
            </h3>
            <Badge variant="outline" className="text-[10px]">
              {MOCK_KEYWORDS.filter((k) => k.status === "good").length}/{MOCK_KEYWORDS.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {MOCK_KEYWORDS.map((kw) => (
              <div key={kw.term} className="flex items-center justify-between gap-2">
                <span className="text-xs truncate flex-1">{kw.term}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {kw.count}x{" "}
                    <span className="text-muted-foreground/50">
                      ({kw.min}-{kw.max})
                    </span>
                  </span>
                  {kw.status === "good" ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : kw.status === "warning" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-destructive" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* NLP Terms */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Termos NLP
            </h3>
            <Badge variant="outline" className="text-[10px]">
              {MOCK_NLP_TERMS.filter((t) => t.found).length}/{MOCK_NLP_TERMS.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {MOCK_NLP_TERMS.map((nlp) => (
              <div key={nlp.term} className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                    nlp.found
                      ? "bg-success/20 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {nlp.found ? (
                    <Check className="w-2.5 h-2.5" />
                  ) : (
                    <X className="w-2.5 h-2.5" />
                  )}
                </div>
                <span
                  className={`text-xs ${
                    nlp.found ? "text-foreground" : "text-muted-foreground line-through"
                  }`}
                >
                  {nlp.term}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Competitor comparison */}
        <Card className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
            <Search className="w-3 h-3" />
            vs Concorrentes
          </h3>
          <div className="space-y-3">
            {MOCK_COMPETITORS.map((comp) => {
              const variant =
                comp.score >= 80 ? "success" : comp.score >= 60 ? "warning" : "danger";
              return (
                <div key={comp.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs ${
                        comp.isUser ? "font-bold text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {comp.name}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        comp.score >= 80
                          ? "text-success"
                          : comp.score >= 60
                            ? "text-warning"
                            : "text-destructive"
                      }`}
                    >
                      {comp.score}
                    </span>
                  </div>
                  <Progress value={comp.score} variant={variant} />
                </div>
              );
            })}
          </div>
        </Card>
      </motion.aside>
    </div>
  );
}
