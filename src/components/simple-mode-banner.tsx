"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Layers, ArrowRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DISMISS_KEY = "8links:simpleMode.bannerDismissedAt";
const DISMISS_DAYS = 7;

/**
 * Shown when the user finished onboarding in "simple" mode.
 * Invites them to upgrade to the full analysis flow.
 * Dismissible — stays hidden for 7 days.
 */
export function SimpleModeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Respect dismissal first to avoid an extra DB call
      const dismissedAt = typeof window !== "undefined" ? window.localStorage.getItem(DISMISS_KEY) : null;
      if (dismissedAt) {
        const ageMs = Date.now() - parseInt(dismissedAt, 10);
        if (ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_mode, role")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      if (data?.role !== "admin" && data?.onboarding_mode === "simple") setShow(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = () => {
    setShow(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 overflow-hidden border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
        >
          <div className="px-4 sm:px-6 py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Layers className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-xs sm:text-sm flex-1 min-w-0">
                <span className="font-semibold">Modo simples ativo.</span>{" "}
                <span className="text-muted-foreground">Conecte o Google Search Console pra desbloquear tracking de keywords e análise completa.</span>
              </p>
              <Link
                href="/settings"
                className="hidden sm:flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 shrink-0"
              >
                Ativar análise <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={dismiss}
                aria-label="Dispensar aviso"
                className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
