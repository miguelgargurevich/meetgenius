import { NextRequest } from "next/server";
import { handle } from "../_helpers";
import { vocabularyService } from "@/server/services/vocabulary.service";
import { vocabularySchema } from "@/server/validators";

export async function GET() {
  return handle(() => vocabularyService.getVocabulary());
}

export async function PUT(req: NextRequest) {
  return handle(async () => {
    const { terms } = vocabularySchema.parse(await req.json());
    return vocabularyService.setVocabulary(terms);
  });
}
