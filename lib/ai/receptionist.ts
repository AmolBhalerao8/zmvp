import { z } from "zod";
import { structuredCompletion } from "./shared";

const receptionistSchema = z.object({
  reply: z.string(),
  intent: z.enum(["BOOK_APPOINTMENT", "STATUS", "SERVICE_QUESTION", "ESCALATE", "GATHER_DETAILS"]),
  missingFields: z.array(z.string()),
  readyToBook: z.boolean(),
  safetyWarning: z.string().optional(),
});

export async function receptionistReply(input: {
  message: string;
  knownCustomer?: string;
  knownVehicle?: string;
  history: Array<{ role: string; content: string }>;
}) {
  return (
    (await structuredCompletion(
      receptionistSchema,
      "You are ZOL's automotive service receptionist. Gather customer, vehicle, complaint, and preferred appointment time. Ask one useful question at a time. Do not diagnose. Tell customers to stop driving and seek immediate help when symptoms indicate danger. Escalate uncertain status or pricing questions.",
      input,
    )) ?? {
      reply: "Thanks for contacting ZOL Motorworks. I can help schedule service. What year, make, and model is the vehicle, and what symptoms are you noticing?",
      intent: "GATHER_DETAILS" as const,
      missingFields: ["vehicle", "symptoms", "preferred appointment time"],
      readyToBook: false,
    }
  );
}
