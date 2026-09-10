import OpenAI from "openai";
import type { z } from "zod";

export async function structuredCompletion<T>(
  schema: z.ZodType<T>,
  system: string,
  input: unknown,
): Promise<T | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${system}\nReturn valid JSON only.` },
        { role: "user", content: JSON.stringify(input) },
      ],
    });
    return schema.parse(JSON.parse(result.choices[0]?.message.content || "{}"));
  } catch {
    return null;
  }
}
