import { NextRequest } from "next/server";
import { handle } from "../_helpers";
import { taxonomyService } from "@/server/services/taxonomy.service";
import { taxonomySchema } from "@/server/validators";

export async function GET() {
  return handle(() => taxonomyService.listFolders());
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = taxonomySchema.parse(await req.json());
    return taxonomyService.createFolder(body);
  });
}
