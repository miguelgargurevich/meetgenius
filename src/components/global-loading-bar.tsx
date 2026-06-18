"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Barra de progreso superior, visible siempre que haya alguna query o mutación
 * en curso (React Query). Evita que la app se sienta "en blanco" al cargar.
 */
export function GlobalLoadingBar() {
  const active = useIsFetching() + useIsMutating() > 0;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-transparent"
        >
          <span className="animate-loading-bar" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
