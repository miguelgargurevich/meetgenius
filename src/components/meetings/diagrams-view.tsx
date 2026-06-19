"use client";

import { Workflow } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { MermaidDiagrams, type Diagram } from "@/components/report/report-diagrams";

/** Diagramas generados por IA, dentro de la app (reutiliza el render Mermaid). */
export function DiagramsView({ diagrams }: { diagrams?: Diagram[] | null }) {
  if (!diagrams?.length)
    return (
      <EmptyState
        icon={Workflow}
        title="Sin diagramas"
        description="El análisis no generó diagramas para esta reunión."
      />
    );
  return (
    <Card>
      <CardContent className="bg-white p-6 text-zinc-900">
        <MermaidDiagrams diagrams={diagrams} />
      </CardContent>
    </Card>
  );
}
