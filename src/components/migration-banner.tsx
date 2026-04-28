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
      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <p className="text-lg md:text-xl font-bold text-white">
                Nova atualização da 8links!
              </p>
              <p className="text-base md:text-lg text-white/90 mt-1">
                Seus backlinks e sites estão sendo migrados para a nova plataforma.
              </p>
              <p className="text-sm md:text-base text-white/80 mt-1">
                Não se preocupe — você não perdeu nenhum dado. Tudo está sendo transferido automaticamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
