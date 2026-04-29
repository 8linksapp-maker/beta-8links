"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

export function MigrationBanner() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gradient-to-r from-primary via-[hsl(35,100%,55%)] to-[hsl(45,100%,50%)] shrink-0"
    >
      <div className="px-4 py-2.5 sm:px-6">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-white shrink-0" />
          <p className="text-xs sm:text-sm font-semibold text-white">
            Nova atualização! Seus backlinks e sites estão sendo migrados. Nenhum dado foi perdido.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
