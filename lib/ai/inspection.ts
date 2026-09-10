import { z } from "zod";
import { structuredCompletion } from "./shared";

const summarySchema = z.object({
  summary: z.string(),
  urgent: z.array(z.string()),
  recommended: z.array(z.string()),
  maintenance: z.array(z.string()),
  safetyConcerns: z.array(z.string()),
});

export async function summarizeInspection(items: Array<{ category: string; name: string; rating: string; notes?: string | null }>) {
  const findings = items.filter((item) => item.rating !== "NOT_INSPECTED");
  const generated = await structuredCompletion(
    summarySchema,
    "Summarize only the supplied automotive inspection findings in customer-friendly language. Do not infer or invent findings.",
    findings,
  );
  if (generated) return generated;

  const red = findings.filter((item) => item.rating === "RED");
  const yellow = findings.filter((item) => item.rating === "YELLOW");
  return {
    summary: red.length
      ? `${red.length} item${red.length === 1 ? "" : "s"} require prompt attention. ${yellow.length} additional item${yellow.length === 1 ? "" : "s"} should be monitored.`
      : `No urgent items were recorded. ${yellow.length} item${yellow.length === 1 ? "" : "s"} should be monitored.`,
    urgent: red.map((item) => `${item.category}: ${item.notes || item.name}`),
    recommended: yellow.map((item) => `${item.category}: ${item.notes || item.name}`),
    maintenance: [],
    safetyConcerns: red.map((item) => item.name),
  };
}
