"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { MeetingWatcher } from "@/components/layout/meeting-watcher";
import { isDesktopApp } from "@/lib/desktop";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [desktop, setDesktop] = React.useState(false);
  React.useEffect(() => setDesktop(isDesktopApp()), []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Franja superior arrastrable (deja sitio a los semáforos de macOS) */}
      {desktop && <div className="app-drag h-7 w-full shrink-0 bg-[var(--sidebar)]" />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <CommandPalette />
      <MeetingWatcher />
    </div>
  );
}
