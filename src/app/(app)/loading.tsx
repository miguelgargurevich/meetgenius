import { Spinner } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 text-[var(--muted-foreground)]">
      <Spinner className="size-6 text-[var(--primary)]" />
      <p className="text-sm">Cargando…</p>
    </div>
  );
}
