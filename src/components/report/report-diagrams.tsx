"use client";

import * as React from "react";

export interface Diagram {
  type: string;
  title: string;
  mermaid: string;
}

declare global {
  interface Window {
    __reportReady?: boolean;
  }
}

type Rendered = { title: string; svg: string; error: boolean };

let idCounter = 0;

/**
 * Renderiza una lista de diagramas Mermaid a SVG (en cliente, import dinámico).
 * Tolerante: un diagrama inválido no rompe el resto. Si `signalReady`, marca
 * `window.__reportReady = true` cuando termina (lo usa Electron printToPDF para
 * saber cuándo el informe está listo para imprimir).
 */
export function MermaidDiagrams({
  diagrams,
  signalReady = false,
}: {
  diagrams: Diagram[];
  signalReady?: boolean;
}) {
  const [items, setItems] = React.useState<Rendered[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const markReady = () => {
      if (!signalReady || cancelled) return;
      // Doble rAF: aseguramos que el SVG ya está en el layout antes de imprimir.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          window.__reportReady = true;
        }),
      );
    };

    (async () => {
      if (!diagrams.length) {
        setItems([]);
        markReady();
        return;
      }
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
        const out: Rendered[] = [];
        for (const d of diagrams) {
          const id = `mmd-${idCounter++}`;
          try {
            const { svg } = await mermaid.render(id, d.mermaid);
            out.push({ title: d.title, svg, error: false });
          } catch {
            out.push({ title: d.title, svg: "", error: true });
          }
        }
        if (!cancelled) setItems(out);
      } catch {
        if (!cancelled) setItems(diagrams.map((d) => ({ title: d.title, svg: "", error: true })));
      } finally {
        markReady();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [diagrams, signalReady]);

  if (items === null) {
    return <p className="text-sm text-zinc-400">Generando diagramas…</p>;
  }
  if (!items.length) return null;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {items.map((it, i) => (
        <figure
          key={i}
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4"
          style={{ breakInside: "avoid" }}
        >
          <figcaption className="mb-2 text-sm font-semibold text-zinc-700">{it.title}</figcaption>
          {it.error ? (
            <p className="text-xs text-zinc-400">No se pudo renderizar este diagrama.</p>
          ) : (
            <div
              className="mermaid-svg flex justify-center [&_svg]:h-auto [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: it.svg }}
            />
          )}
        </figure>
      ))}
    </div>
  );
}
