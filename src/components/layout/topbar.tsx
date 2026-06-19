"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Search, Radio, Bell, BellOff, SpellCheck } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/misc";
import { VocabularyDialog } from "@/components/settings/vocabulary-dialog";
import { desktop as desktopBridge, isDesktopApp } from "@/lib/desktop";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [vocabOpen, setVocabOpen] = React.useState(false);
  const [autoRecord, setAutoRecord] = React.useState(false);
  const [reminders, setReminders] = React.useState(true);
  const [desktop, setDesktop] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    const isDesk = isDesktopApp();
    setDesktop(isDesk);
    setAutoRecord(localStorage.getItem("mg:autoRecord") === "1");
    const remOn = localStorage.getItem("mg:reminders") !== "0"; // por defecto activos
    setReminders(remOn);
    if (isDesk) desktopBridge()?.setReminders?.({ enabled: remOn });
  }, []);

  const toggleAutoRecord = () => {
    const next = !autoRecord;
    setAutoRecord(next);
    localStorage.setItem("mg:autoRecord", next ? "1" : "0");
    toast.success(
      next
        ? "Auto-grabación activada: grabaré las reuniones detectadas automáticamente."
        : "Auto-grabación desactivada: te preguntaré antes de grabar.",
    );
  };

  const toggleReminders = () => {
    const next = !reminders;
    setReminders(next);
    localStorage.setItem("mg:reminders", next ? "1" : "0");
    desktopBridge()?.setReminders?.({ enabled: next });
    toast.success(
      next
        ? "Recordatorios activados: te avisaré antes de cada reunión."
        : "Recordatorios desactivados.",
    );
  };

  const openPalette = () =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));

  return (
    <header className="app-drag flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-6 backdrop-blur">
      <button
        onClick={openPalette}
        className="app-no-drag flex w-72 items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      <div className="app-no-drag flex items-center gap-3">
        {mounted && desktop && (
          <>
            <button
              onClick={toggleReminders}
              title="Avisarme antes de cada reunión"
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                reminders
                  ? "border-transparent bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-[var(--brand-400)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
              )}
            >
              {reminders ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
              Recordatorios
            </button>
            <button
              onClick={toggleAutoRecord}
              title="Grabar automáticamente las reuniones detectadas"
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                autoRecord
                  ? "border-transparent bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-[var(--brand-400)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
              )}
            >
              <Radio className={cn("size-3.5", autoRecord && "animate-recording")} />
              Auto-grabar
            </button>
          </>
        )}
        <button
          onClick={() => setVocabOpen(true)}
          title="Vocabulario personalizado (nombres y jerga)"
          className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        >
          <SpellCheck className="size-3.5" />
          Vocabulario
        </button>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex size-9 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          aria-label="Cambiar tema"
        >
          {mounted && theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <Avatar name="Usuario Demo" />
      </div>

      <VocabularyDialog open={vocabOpen} onClose={() => setVocabOpen(false)} />
    </header>
  );
}
