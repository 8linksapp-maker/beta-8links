"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const SUPPORT_PHONE = "5511998710302";
const DEFAULT_MESSAGE = "Oi! Preciso de ajuda com a 8links.";

function WhatsAppIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.001 3C8.82 3 3 8.82 3 16c0 2.296.604 4.541 1.752 6.516L3 29l6.652-1.713A12.95 12.95 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16.001 3Zm0 23.6a10.59 10.59 0 0 1-5.4-1.479l-.387-.23-3.948 1.017 1.05-3.85-.252-.397A10.6 10.6 0 1 1 16 26.6Zm5.97-7.943c-.327-.164-1.937-.957-2.236-1.066-.299-.108-.517-.163-.735.163-.218.327-.842 1.066-1.034 1.284-.19.218-.38.245-.707.082-.327-.164-1.382-.51-2.633-1.624-.973-.866-1.628-1.937-1.819-2.264-.19-.327-.02-.503.143-.666.146-.146.327-.38.49-.572.164-.19.218-.327.328-.545.108-.218.054-.408-.027-.572-.082-.163-.735-1.776-1.008-2.43-.265-.638-.534-.55-.735-.561a13.4 13.4 0 0 0-.626-.011c-.218 0-.572.082-.871.408-.299.327-1.143 1.117-1.143 2.722 0 1.605 1.17 3.158 1.333 3.376.164.218 2.302 3.515 5.578 4.927.78.336 1.387.537 1.86.687.781.248 1.492.213 2.054.13.626-.094 1.937-.792 2.21-1.557.273-.764.273-1.42.19-1.557-.082-.135-.299-.218-.626-.381Z" />
    </svg>
  );
}

function GradientAvatar({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`${className} rounded-full bg-gradient-to-br from-primary via-[hsl(35,100%,55%)] to-[hsl(20,100%,50%)] flex items-center justify-center font-black text-white shadow-md ring-2 ring-card`}>
      <span className="text-base">8</span>
    </div>
  );
}

export function WhatsAppFab() {
  const [open, setOpen] = useState(false);
  const [pulsing, setPulsing] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setPulsing(false), 9000);
    return () => clearTimeout(t);
  }, []);

  const buildLink = (text: string) =>
    `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(text)}`;

  const closeAndGo = () => setOpen(false);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className="fixed bottom-24 right-6 z-50 w-[320px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            role="dialog"
            aria-label="Falar com o suporte"
          >
            {/* Header */}
            <div className="relative p-4 bg-gradient-to-br from-[#128C7E] via-[#25D366] to-[#1ebc5a] text-white overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
              <div className="relative flex items-center gap-3">
                <div className="relative">
                  <GradientAvatar />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#22c55e] ring-2 ring-[#128C7E]">
                    <span className="absolute inset-0 rounded-full bg-[#22c55e] animate-ping opacity-75" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-tight">Suporte 8links</p>
                  <p className="text-[11px] opacity-90 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#86efac]" />
                    Online
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Greeting bubble — WhatsApp style */}
            <div className="px-4 pt-4 pb-2 bg-[hsl(20,8%,5%)]">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="relative max-w-[85%] bg-card rounded-2xl rounded-tl-sm px-3 py-2 border border-border"
              >
                <p className="text-xs leading-relaxed">
                  Olá! 👋 Como posso te ajudar hoje?
                </p>
              </motion.div>
            </div>

            {/* Quick actions */}
            <div className="p-3 space-y-1.5 bg-card">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-1 mb-1">Escolha um motivo</p>
              {[
                { label: "Reportar um problema", sub: "Algo não está funcionando", msg: "Oi! Tô tendo um problema na 8links e preciso de ajuda." },
                { label: "Tirar uma dúvida", sub: "Como usar uma funcionalidade", msg: "Oi! Tenho uma dúvida sobre como usar a 8links." },
                { label: "Outro assunto", sub: "Qualquer outra coisa", msg: DEFAULT_MESSAGE },
              ].map((item) => (
                <a
                  key={item.label}
                  href={buildLink(item.msg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={closeAndGo}
                >
                  <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center group-hover:bg-[#25D366]/20 transition-colors shrink-0">
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
                </a>
              ))}
            </div>

            {/* Footer — link to full ticket */}
            <Link
              href="/support"
              onClick={closeAndGo}
              className="block px-4 py-3 border-t border-border bg-muted/30 hover:bg-muted/50 transition-colors text-center"
            >
              <p className="text-[11px] text-muted-foreground">
                Prefere abrir um ticket detalhado? <span className="text-primary font-semibold">Clique aqui →</span>
              </p>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setPulsing(false); }}
        aria-label={open ? "Fechar suporte" : "Falar com suporte no WhatsApp"}
        className="group fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white shadow-lg flex items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-xl active:scale-95"
      >
        {/* Pulse rings — only on initial load */}
        {pulsing && !open && (
          <>
            <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-40" />
            <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" style={{ animationDelay: "0.6s" }} />
          </>
        )}

        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="wa" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }} className="relative">
              <WhatsAppIcon className="w-7 h-7" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tooltip */}
        {!open && (
          <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-foreground">
            Falar com o suporte
          </span>
        )}
      </button>
    </>
  );
}
