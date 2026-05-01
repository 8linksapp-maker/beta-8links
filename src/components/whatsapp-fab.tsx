"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X } from "lucide-react";

const SUPPORT_PHONE = "5511998710302";
const DEFAULT_MESSAGE = "Oi! Preciso de ajuda com a 8links.";

export function WhatsAppFab() {
  const [open, setOpen] = useState(false);

  const buildLink = (text: string) =>
    `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(text)}`;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-6 z-50 w-72 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-[#25D366] to-[#1ebc5a] text-white">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center backdrop-blur">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Suporte 8links</p>
                <p className="text-[11px] opacity-90">Resposta rápida no WhatsApp</p>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <a
                href={buildLink("Oi! Tô tendo um problema na 8links e preciso de ajuda.")}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 rounded-lg hover:bg-muted text-xs transition-colors"
                onClick={() => setOpen(false)}
              >
                <p className="font-semibold">Reportar um problema</p>
                <p className="text-muted-foreground text-[10px] mt-0.5">Algo não está funcionando</p>
              </a>
              <a
                href={buildLink("Oi! Tenho uma dúvida sobre como usar a 8links.")}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 rounded-lg hover:bg-muted text-xs transition-colors"
                onClick={() => setOpen(false)}
              >
                <p className="font-semibold">Tirar uma dúvida</p>
                <p className="text-muted-foreground text-[10px] mt-0.5">Como usar uma funcionalidade</p>
              </a>
              <a
                href={buildLink(DEFAULT_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 rounded-lg hover:bg-muted text-xs transition-colors"
                onClick={() => setOpen(false)}
              >
                <p className="font-semibold">Outro assunto</p>
                <p className="text-muted-foreground text-[10px] mt-0.5">Qualquer coisa que não esteja acima</p>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={open ? "Fechar suporte" : "Falar com suporte no WhatsApp"}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#25D366] to-[#1ebc5a] text-white shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="msg" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </>
  );
}
