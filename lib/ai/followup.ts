import { z } from "zod";
import { structuredCompletion } from "./shared";

const followUpSchema = z.object({
  subject: z.string(),
  message: z.string(),
  callToAction: z.string(),
});

export async function createFollowUp(input: {
  customerName: string;
  vehicle: string;
  reason: string;
  verifiedDetails: string;
}) {
  return (
    (await structuredCompletion(
      followUpSchema,
      "Write a warm, concise automotive shop follow-up. Use only supplied facts; never invent a service or vehicle problem.",
      input,
    )) ?? {
      subject: `A quick follow-up about your ${input.vehicle}`,
      message: `Hi ${input.customerName}, we wanted to follow up about ${input.reason.toLowerCase()}. ${input.verifiedDetails}`,
      callToAction: "Reply here or call us when you are ready to schedule.",
    }
  );
}
