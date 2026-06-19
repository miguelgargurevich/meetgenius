import { NextRequest } from "next/server";
import { handle } from "../../../_helpers";
import { taxonomyService } from "@/server/services/taxonomy.service";
import { meetingTaxonomySchema } from "@/server/validators";

/** Asigna carpetas/etiquetas a una reunión (reemplaza el conjunto). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const body = meetingTaxonomySchema.parse(await req.json());
    return taxonomyService.setMeetingTaxonomy(id, body);
  });
}
