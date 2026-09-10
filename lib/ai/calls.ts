import { z } from "zod";
import { structuredCompletion } from "./shared";

export const callIntakeSchema = z.object({
  customerName: z.string(),
  phone: z.string(),
  vehicle: z.object({
    year: z.number().int().min(1900).max(2100),
    make: z.string(),
    model: z.string(),
  }),
  complaint: z.string(),
  symptoms: z.array(z.string()),
  urgency: z.enum(["ROUTINE", "SOON", "URGENT", "STOP_DRIVING"]),
  serviceType: z.string(),
  preferredTime: z.string(),
  summary: z.string(),
  safetyAdvice: z.string().optional(),
});

export type CallIntake = z.infer<typeof callIntakeSchema>;

export async function extractCallIntake(
  transcript: Array<{ role: "assistant" | "customer"; content: string }>,
): Promise<{ intake: CallIntake; source: "openai" | "fallback" }> {
  const generated = await structuredCompletion(
    callIntakeSchema,
    "Extract automotive call-intake facts from the transcript only. Do not diagnose. Classify urgency conservatively and provide safety advice only when supported by described symptoms.",
    transcript,
  );
  if (generated) return { intake: generated, source: "openai" };

  return {
    source: "fallback",
    intake: {
      customerName: "Jordan Lee",
      phone: "(530) 555-0171",
      vehicle: { year: 2015, make: "Chevrolet", model: "Sonic" },
      complaint: "Check engine light with shaking at idle",
      symptoms: ["Check engine light", "Rough idle", "Shaking while stopped"],
      urgency: "SOON",
      serviceType: "Check-engine diagnostics",
      preferredTime: "Tomorrow morning",
      summary: "Returning customer reports a check-engine light and rough idle on a 2015 Chevrolet Sonic and requested the earliest morning diagnostic appointment.",
      safetyAdvice: "Avoid extended driving and stop if the check-engine light flashes or the vehicle loses power.",
    },
  };
}

export const demoCallTranscript = [
  { role: "assistant" as const, content: "Thank you for calling ZOL Motorworks. I’m Ava, the AI service receptionist. How can I help today?" },
  { role: "customer" as const, content: "Hi, this is Jordan Lee. My 2015 Chevy Sonic has a check engine light and it shakes when I’m stopped." },
  { role: "assistant" as const, content: "I can help arrange diagnostics. Is the light steady or flashing, and have you noticed stalling, overheating, or a loss of power?" },
  { role: "customer" as const, content: "It stays on steadily. No overheating or stalling, but it feels weaker than normal." },
  { role: "assistant" as const, content: "Thank you. A steady light with rough running should be inspected soon. If it begins flashing or loses significant power, please stop driving. Would tomorrow morning work?" },
  { role: "customer" as const, content: "Yes, the earliest appointment tomorrow would be great." },
  { role: "assistant" as const, content: "I found your Sonic and an 8:00 AM diagnostic opening with Marcus. I’ll book it and text the confirmation now." },
];
