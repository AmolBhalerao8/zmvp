import OpenAI from "openai";
import { z } from "zod";

export const diagnosticResultSchema = z.object({
  causes: z.array(z.object({
    title: z.string(),
    confidence: z.number().min(0).max(100),
    explanation: z.string(),
    supportingSymptoms: z.array(z.string()),
  })).min(1).max(5),
  diagnosticSteps: z.array(z.string()).min(1),
  suggestedTests: z.array(z.string()).min(1),
  potentialRepair: z.object({
    repair: z.string(),
    parts: z.array(z.string()),
    laborCategory: z.string(),
  }),
  warnings: z.array(z.string()).min(1),
});

export type DiagnosticResult = z.infer<typeof diagnosticResultSchema>;
export type DiagnosticInput = {
  vehicle: string;
  engine?: string | null;
  mileage: number;
  complaint: string;
  obdCodes: string[];
  symptoms?: string;
  observations?: string;
  history?: string;
};

const fallback = (input: DiagnosticInput): DiagnosticResult => ({
  causes: [
    {
      title: "Ignition system fault",
      confidence: input.obdCodes.some((code) => code.startsWith("P03")) ? 72 : 45,
      explanation: "The reported drivability symptoms warrant testing ignition output and service condition.",
      supportingSymptoms: [input.complaint, ...(input.symptoms ? [input.symptoms] : [])],
    },
    {
      title: "Air or fuel delivery issue",
      confidence: 48,
      explanation: "Unmetered air, fuel pressure, or injector performance can create similar symptoms.",
      supportingSymptoms: input.obdCodes,
    },
  ],
  diagnosticSteps: ["Confirm the complaint and scan all modules", "Review freeze-frame and live data", "Perform targeted visual inspection", "Test the highest-probability system before replacing parts"],
  suggestedTests: ["Inspect connectors and wiring", "Check relevant voltage and grounds", "Review fuel trims and misfire counters", "Smoke-test intake if fuel trims indicate a lean condition"],
  potentialRepair: { repair: "Repair recommendation pending technician testing", parts: ["To be confirmed after testing"], laborCategory: "Advanced diagnostics" },
  warnings: ["Fallback guidance is based only on entered information.", "AI-assisted diagnostic recommendation — technician verification required."],
});

export async function analyzeDiagnostic(input: DiagnosticInput): Promise<{ result: DiagnosticResult; source: "openai" | "fallback" }> {
  if (!process.env.OPENAI_API_KEY) return { result: fallback(input), source: "fallback" };

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You assist professional automotive technicians. Return JSON only with keys causes, diagnosticSteps, suggestedTests, potentialRepair, warnings. Never claim certainty, invent measurements, or recommend replacing a part without testing. causes must contain title, confidence 0-100, explanation, supportingSymptoms. potentialRepair must contain repair, parts, laborCategory.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
    });
    const parsed = diagnosticResultSchema.safeParse(JSON.parse(completion.choices[0]?.message.content || "{}"));
    if (!parsed.success) return { result: fallback(input), source: "fallback" };
    parsed.data.warnings.push("AI-assisted diagnostic recommendation — technician verification required.");
    return { result: parsed.data, source: "openai" };
  } catch {
    return { result: fallback(input), source: "fallback" };
  }
}
