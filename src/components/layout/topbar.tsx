"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Search } from "lucide-react";
import { Avatar } from "@/components/ui/misc";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const openPalette = () =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-6 backdrop-blur">
      <button
        onClick={openPalette}
        className="flex w-72 items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex size-9 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          aria-label="Cambiar tema"
        >
          {mounted && theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <Avatar name="Usuario Demo" />
      </div>
    </header>
  );
}
