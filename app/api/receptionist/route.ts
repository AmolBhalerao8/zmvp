import { z } from "zod";
import { receptionistReply } from "@/lib/ai/receptionist";

const inputSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(20),
});

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    return Response.json(await receptionistReply(input));
  } catch {
    return Response.json({ error: "Please send a valid message." }, { status: 400 });
  }
}
