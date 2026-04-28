"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

export function MigrationBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-[110] bg-gradient-to-r from-primary via-[hsl(35,100%,55%)] to-[hsl(45,100%,50%)]"
    >
      <div className="max-w-[1400px] mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-base font-bold text-white">
                Nova atualização da 8links!
              </p>
              <p className="text-sm text-white/90">
                Seus backlinks e sites estão sendo migrados.
              </p>
              <p className="text-sm text-white/80">
                Não se preocupe — você não perdeu nenhum dado.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
