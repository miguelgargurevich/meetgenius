import { NextRequest } from "next/server";
import { handle } from "../../_helpers";
import { taxonomyService } from "@/server/services/taxonomy.service";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => taxonomyService.deleteFolder(id));
}
