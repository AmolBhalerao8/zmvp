import { z } from "zod";
import { structuredCompletion } from "./shared";

export const estimateSuggestionSchema = z.object({
  explanation: z.string(),
  laborCategories: z.array(z.string()),
  partCategories: z.array(z.string()),
  customerDescription: z.string(),
  disclaimer: z.string(),
});

export async function suggestEstimate(input: {
  vehicle: string;
  diagnosis: string;
  findings: string[];
}) {
  return (
    (await structuredCompletion(
      estimateSuggestionSchema,
      "Suggest categories for an automotive estimate from supplied facts only. Do not provide or claim live pricing.",
      input,
    )) ?? {
      explanation: "A technician-confirmed repair can be converted into labor and parts line items.",
      laborCategories: ["Diagnostic labor", "Repair labor"],
      partCategories: ["OE-quality replacement parts, pending verification"],
      customerDescription: `Recommended work for ${input.vehicle} based on technician findings: ${input.diagnosis}.`,
      disclaimer: "Pricing is estimated/demo pricing and must be verified by the shop.",
    }
  );
}
