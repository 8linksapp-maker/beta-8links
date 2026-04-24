import Link from "next/link";
import { Link as LinkIcon, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center mb-6">
        <LinkIcon className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-6xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2" style={{ background: 'linear-gradient(135deg, hsl(24, 100%, 55%), hsl(45, 100%, 65%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        404
      </h1>
      <p className="text-lg font-semibold mb-2">Página não encontrada</p>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-hover transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
      </Link>
    </div>
  );
}
