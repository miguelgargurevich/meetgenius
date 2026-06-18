import { NextRequest } from "next/server";
import { handle } from "../_helpers";
import { chatService } from "@/server/services/chat.service";
import { chatSchema } from "@/server/validators";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = chatSchema.parse(await req.json());
    return chatService.ask(body);
  });
}
