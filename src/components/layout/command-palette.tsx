"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, CornerDownLeft } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { Plus } from "lucide-react";

interface Command {
  label: string;
  hint?: string;
  action: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const commands: Command[] = React.useMemo(
    () => [
      {
        label: "Nueva reunión",
        hint: "Crear y grabar",
        action: () => router.push("/meetings?new=1"),
      },
      ...NAV_ITEMS.map((n) => ({
        label: `Ir a ${n.label}`,
        action: () => router.push(n.href),
      })),
    ],
    [router],
  );

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );

  React.useEffect(() => setActive(0), [query]);

  const run = (c: Command) => {
    c.action();
    setOpen(false);
    setQuery("");
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[18vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, filtered.length - 1));
              if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
              if (e.key === "Enter" && filtered[active]) run(filtered[active]);
            }}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4">
              <Search className="size-4 text-[var(--muted-foreground)]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar acciones o navegar…"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
              />
              <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                ESC
              </kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
                  Sin resultados
                </p>
              )}
              {filtered.map((c, i) => (
                <button
                  key={c.label}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(c)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm ${
                    i === active ? "bg-[var(--accent)]" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {c.label === "Nueva reunión" && <Plus className="size-4 text-[var(--brand-400)]" />}
                    {c.label}
                  </span>
                  {c.hint && (
                    <span className="text-xs text-[var(--muted-foreground)]">{c.hint}</span>
                  )}
                  {i === active && <CornerDownLeft className="size-3.5 text-[var(--muted-foreground)]" />}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
