"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { requireManager, requireSession, requireStaff } from "@/lib/auth/session";
import { analyzeDiagnostic } from "@/lib/ai/diagnostics";
import { summarizeInspection } from "@/lib/ai/inspection";
import { createFollowUp } from "@/lib/ai/followup";
import { demoCallTranscript, extractCallIntake } from "@/lib/ai/calls";
import { createPayment } from "@/lib/payments/provider";
import { messagingProvider } from "@/lib/messaging/provider";

const idSchema = z.string().cuid();

export async function createCustomer(formData: FormData) {
  const session = await requireStaff();
  const input = z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    phone: z.string().trim().min(7).max(30),
    email: z.string().email().optional().or(z.literal("")),
  }).parse(Object.fromEntries(formData));
  await prisma.customer.create({
    data: { shopId: session.user.shopId, ...input, email: input.email || null },
  });
  revalidatePath("/customers");
}

export async function createAppointment(formData: FormData) {
  const session = await requireSession();
  const input = z.object({
    customerId: idSchema,
    vehicleId: idSchema,
    technicianId: idSchema.optional().or(z.literal("")),
    scheduledAt: z.coerce.date(),
    serviceType: z.string().trim().min(2).max(100),
    complaint: z.string().trim().min(5).max(1000),
  }).parse(Object.fromEntries(formData));
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, shopId: session.user.shopId },
  });
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, customerId: input.customerId, shopId: session.user.shopId },
  });
  if (!customer || !vehicle || (session.user.role === "CUSTOMER" && session.user.customerId !== customer.id)) {
    throw new Error("Customer or vehicle not found.");
  }
  await prisma.appointment.create({
    data: {
      shopId: session.user.shopId,
      customerId: customer.id,
      vehicleId: vehicle.id,
      technicianId: input.technicianId || null,
      scheduledAt: input.scheduledAt,
      serviceType: input.serviceType,
      complaint: input.complaint,
      status: "SCHEDULED",
    },
  });
  revalidatePath("/");
  revalidatePath("/appointments");
}

export async function checkInAppointment(formData: FormData) {
  const session = await requireStaff();
  const input = z.object({
    appointmentId: idSchema,
    mileage: z.coerce.number().int().positive(),
    fuelLevel: z.coerce.number().int().min(0).max(100),
    visibleDamage: z.string().max(1000).optional(),
    notes: z.string().max(2000).optional(),
  }).parse(Object.fromEntries(formData));
  const appointment = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, shopId: session.user.shopId },
    include: { repairOrder: true },
  });
  if (!appointment) throw new Error("Appointment not found.");
  if (appointment.repairOrder) redirect(`/repair-orders/${appointment.repairOrder.id}`);
  const count = await prisma.repairOrder.count({ where: { shopId: session.user.shopId } });
  const ro = await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id: appointment.id }, data: { status: "CHECKED_IN" } });
    await tx.vehicle.update({ where: { id: appointment.vehicleId }, data: { mileage: input.mileage } });
    const created = await tx.repairOrder.create({
      data: {
        shopId: session.user.shopId,
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        vehicleId: appointment.vehicleId,
        technicianId: appointment.technicianId,
        roNumber: `RO-${1050 + count}`,
        complaint: appointment.complaint,
        mileageIn: input.mileage,
        fuelLevel: input.fuelLevel,
        visibleDamage: input.visibleDamage || null,
        checkInNotes: input.notes || null,
        checkedInAt: new Date(),
        status: "CHECKED_IN",
      },
    });
    await tx.notification.create({
      data: { shopId: session.user.shopId, type: "CHECK_IN", title: "Vehicle checked in", body: `${created.roNumber} was created.`, href: `/repair-orders/${created.id}` },
    });
    return created;
  });
  revalidatePath("/");
  revalidatePath("/appointments");
  redirect(`/repair-orders/${ro.id}`);
}

export async function updateRepairOrderStatus(formData: FormData) {
  const session = await requireStaff();
  const input = z.object({
    repairOrderId: idSchema,
    status: z.enum(["NEW", "CHECKED_IN", "DIAGNOSING", "AWAITING_APPROVAL", "WAITING_FOR_PARTS", "IN_REPAIR", "QUALITY_CHECK", "READY_FOR_PICKUP", "COMPLETED", "CLOSED"]),
  }).parse(Object.fromEntries(formData));
  const result = await prisma.repairOrder.updateMany({
    where: { id: input.repairOrderId, shopId: session.user.shopId },
    data: { status: input.status, completedAt: ["COMPLETED", "CLOSED"].includes(input.status) ? new Date() : undefined },
  });
  if (!result.count) throw new Error("Repair order not found.");
  revalidatePath("/");
  revalidatePath("/repair-orders");
  revalidatePath(`/repair-orders/${input.repairOrderId}`);
}

export async function runDiagnostic(formData: FormData) {
  const session = await requireStaff();
  const input = z.object({
    repairOrderId: idSchema,
    obdCodes: z.string().max(200),
    symptoms: z.string().trim().min(3).max(2000),
    observations: z.string().max(3000).optional(),
  }).parse(Object.fromEntries(formData));
  const ro = await prisma.repairOrder.findFirst({
    where: { id: input.repairOrderId, shopId: session.user.shopId },
    include: { vehicle: true },
  });
  if (!ro) throw new Error("Repair order not found.");
  const codes = input.obdCodes.split(/[,\s]+/).filter(Boolean).map((code) => code.toUpperCase());
  const analysis = await analyzeDiagnostic({
    vehicle: `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`,
    engine: ro.vehicle.engine,
    mileage: ro.mileageIn,
    complaint: ro.complaint,
    obdCodes: codes,
    symptoms: input.symptoms,
    observations: input.observations,
  });
  await prisma.$transaction([
    prisma.diagnostic.create({
      data: {
        shopId: session.user.shopId,
        repairOrderId: ro.id,
        vehicleId: ro.vehicleId,
        technicianId: session.user.id,
        obdCodes: codes,
        symptoms: input.symptoms,
        observations: input.observations,
        aiResult: analysis.result,
        aiStatus: analysis.source === "openai" ? "AI_COMPLETED" : "FALLBACK_COMPLETED",
      },
    }),
    prisma.repairOrder.update({ where: { id: ro.id }, data: { status: "DIAGNOSING" } }),
  ]);
  revalidatePath(`/repair-orders/${ro.id}`);
}

export async function createInspection(formData: FormData) {
  const session = await requireStaff();
  const repairOrderId = idSchema.parse(formData.get("repairOrderId"));
  const ro = await prisma.repairOrder.findFirst({ where: { id: repairOrderId, shopId: session.user.shopId } });
  if (!ro) throw new Error("Repair order not found.");
  const categories = ["Engine", "Transmission", "Brakes", "Tires", "Suspension", "Steering", "Battery", "Fluids", "Lights", "HVAC", "Exterior", "Interior", "Safety"];
  await prisma.inspection.create({
    data: {
      shopId: session.user.shopId,
      repairOrderId: ro.id,
      vehicleId: ro.vehicleId,
      technicianId: session.user.id,
      title: "Digital Vehicle Inspection",
      items: { create: categories.map((category, sortOrder) => ({ category, name: `${category} condition`, sortOrder })) },
    },
  });
  revalidatePath(`/repair-orders/${ro.id}`);
}

export async function updateInspectionItem(formData: FormData) {
  const session = await requireStaff();
  const input = z.object({
    itemId: idSchema,
    rating: z.enum(["GREEN", "YELLOW", "RED", "NOT_INSPECTED"]),
    notes: z.string().max(1000).optional(),
    measurement: z.string().max(100).optional(),
  }).parse(Object.fromEntries(formData));
  const item = await prisma.inspectionItem.findFirst({
    where: { id: input.itemId, inspection: { shopId: session.user.shopId } },
    include: { inspection: true },
  });
  if (!item) throw new Error("Inspection item not found.");
  await prisma.inspectionItem.update({
    where: { id: item.id },
    data: { rating: input.rating, notes: input.notes, measurement: input.measurement },
  });
  revalidatePath(`/repair-orders/${item.inspection.repairOrderId}`);
}

export async function generateInspectionSummary(formData: FormData) {
  const session = await requireStaff();
  const inspectionId = idSchema.parse(formData.get("inspectionId"));
  const inspection = await prisma.inspection.findFirst({
    where: { id: inspectionId, shopId: session.user.shopId },
    include: { items: true },
  });
  if (!inspection) throw new Error("Inspection not found.");
  const summary = await summarizeInspection(inspection.items);
  const severity = inspection.items.some((i) => i.rating === "RED") ? "RED" : inspection.items.some((i) => i.rating === "YELLOW") ? "YELLOW" : "GREEN";
  await prisma.inspection.update({
    where: { id: inspection.id },
    data: { aiSummary: summary.summary, overallRating: severity, completedAt: new Date() },
  });
  revalidatePath(`/repair-orders/${inspection.repairOrderId}`);
}

export async function approveEstimate(formData: FormData) {
  const input = z.object({ portalToken: z.string().min(10), decision: z.enum(["APPROVED", "DECLINED"]) }).parse(Object.fromEntries(formData));
  const estimate = await prisma.estimate.findUnique({ where: { portalToken: input.portalToken }, include: { repairOrder: true, items: true } });
  if (!estimate) throw new Error("Estimate not found.");
  await prisma.$transaction(async (tx) => {
    await tx.estimate.update({
      where: { id: estimate.id },
      data: {
        status: input.decision,
        respondedAt: new Date(),
        items: { updateMany: { where: {}, data: { approvalStatus: input.decision } } },
      },
    });
    await tx.repairOrder.update({
      where: { id: estimate.repairOrderId },
      data: { status: input.decision === "APPROVED" ? "IN_REPAIR" : "AWAITING_APPROVAL" },
    });
    if (input.decision === "DECLINED") {
      await tx.cRMFollowUp.create({
        data: {
          shopId: estimate.shopId,
          customerId: estimate.customerId,
          vehicleId: estimate.vehicleId,
          repairOrderId: estimate.repairOrderId,
          type: "DECLINED_SERVICE",
          title: `Declined estimate ${estimate.estimateNumber}`,
          details: estimate.items.map((item) => item.description).join(", "),
          dueAt: new Date(Date.now() + 14 * 86400000),
        },
      });
    }
    await tx.notification.create({
      data: { shopId: estimate.shopId, type: "ESTIMATE", title: `Estimate ${input.decision.toLowerCase()}`, body: `${estimate.estimateNumber} was ${input.decision.toLowerCase()}.`, href: `/repair-orders/${estimate.repairOrderId}` },
    });
  });
  revalidatePath(`/portal/estimate/${input.portalToken}`);
}

export async function updatePartStatus(formData: FormData) {
  const session = await requireStaff();
  const input = z.object({
    partId: idSchema,
    status: z.enum(["NEEDED", "REQUESTED", "ORDERED", "RECEIVED", "INSTALLED", "RETURNED"]),
  }).parse(Object.fromEntries(formData));
  const part = await prisma.part.findFirst({ where: { id: input.partId, shopId: session.user.shopId } });
  if (!part) throw new Error("Part not found.");
  await prisma.part.update({
    where: { id: part.id },
    data: {
      status: input.status,
      orderedAt: input.status === "ORDERED" ? new Date() : undefined,
      receivedAt: input.status === "RECEIVED" ? new Date() : undefined,
      installedAt: input.status === "INSTALLED" ? new Date() : undefined,
    },
  });
  revalidatePath("/parts");
  revalidatePath(`/repair-orders/${part.repairOrderId}`);
}

export async function createEstimate(formData: FormData) {
  const session = await requireStaff();
  const input = z.object({
    repairOrderId: idSchema,
    laborDescription: z.string().trim().min(3).max(300),
    laborAmount: z.coerce.number().nonnegative(),
    partDescription: z.string().trim().min(3).max(300),
    partAmount: z.coerce.number().nonnegative(),
  }).parse(Object.fromEntries(formData));
  const ro = await prisma.repairOrder.findFirst({ where: { id: input.repairOrderId, shopId: session.user.shopId } });
  if (!ro) throw new Error("Repair order not found.");
  const shop = await prisma.shop.findUniqueOrThrow({ where: { id: session.user.shopId } });
  const subtotal = input.laborAmount + input.partAmount;
  const tax = Number((input.partAmount * (Number(shop.taxRate) / 100)).toFixed(2));
  const count = await prisma.estimate.count({ where: { shopId: session.user.shopId } });
  await prisma.$transaction([
    prisma.estimate.create({
      data: {
        shopId: session.user.shopId,
        repairOrderId: ro.id,
        customerId: ro.customerId,
        vehicleId: ro.vehicleId,
        estimateNumber: `EST-${2050 + count}`,
        status: "SENT",
        subtotal,
        tax,
        total: subtotal + tax,
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 86400000),
        items: { create: [
          { type: "LABOR", description: input.laborDescription, quantity: 1, unitPrice: input.laborAmount, total: input.laborAmount },
          { type: "PART", description: input.partDescription, quantity: 1, unitPrice: input.partAmount, total: input.partAmount },
        ] },
      },
    }),
    prisma.repairOrder.update({ where: { id: ro.id }, data: { status: "AWAITING_APPROVAL" } }),
  ]);
  revalidatePath(`/repair-orders/${ro.id}`);
  revalidatePath("/estimates");
}

export async function addPart(formData: FormData) {
  const session = await requireStaff();
  const input = z.object({
    repairOrderId: idSchema,
    name: z.string().trim().min(2).max(200),
    partNumber: z.string().max(100).optional(),
    supplier: z.string().max(100).optional(),
    cost: z.coerce.number().nonnegative(),
    price: z.coerce.number().nonnegative(),
  }).parse(Object.fromEntries(formData));
  const ro = await prisma.repairOrder.findFirst({ where: { id: input.repairOrderId, shopId: session.user.shopId } });
  if (!ro) throw new Error("Repair order not found.");
  await prisma.part.create({ data: { shopId: session.user.shopId, repairOrderId: ro.id, name: input.name, partNumber: input.partNumber, supplier: input.supplier, unitCost: input.cost, unitPrice: input.price, status: "NEEDED" } });
  revalidatePath(`/repair-orders/${ro.id}`);
  revalidatePath("/parts");
}

export async function generateInvoice(formData: FormData) {
  const session = await requireManager();
  const repairOrderId = idSchema.parse(formData.get("repairOrderId"));
  const ro = await prisma.repairOrder.findFirst({
    where: { id: repairOrderId, shopId: session.user.shopId },
    include: { estimates: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, include: { items: true } }, invoice: true },
  });
  if (!ro || ro.invoice) throw new Error(ro?.invoice ? "Invoice already exists." : "Repair order not found.");
  const estimate = ro.estimates[0];
  if (!estimate) throw new Error("An approved estimate is required.");
  const count = await prisma.invoice.count({ where: { shopId: session.user.shopId } });
  await prisma.invoice.create({
    data: {
      shopId: session.user.shopId,
      repairOrderId: ro.id,
      estimateId: estimate.id,
      customerId: ro.customerId,
      vehicleId: ro.vehicleId,
      invoiceNumber: `INV-${3050 + count}`,
      status: "OPEN",
      subtotal: estimate.subtotal,
      tax: estimate.tax,
      discount: estimate.discount,
      total: estimate.total,
      dueAt: new Date(Date.now() + 7 * 86400000),
      items: { create: estimate.items.filter((i) => i.approvalStatus === "APPROVED").map((item) => ({ type: item.type, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, total: item.total })) },
    },
  });
  revalidatePath(`/repair-orders/${ro.id}`);
  revalidatePath("/invoices");
}

export async function payInvoice(formData: FormData) {
  const input = z.object({ invoiceId: idSchema, portal: z.string().optional() }).parse(Object.fromEntries(formData));
  const [invoice, session] = await Promise.all([
    prisma.invoice.findUnique({ where: { id: input.invoiceId }, include: { customer: true, vehicle: true, estimate: true } }),
    auth(),
  ]);
  if (!invoice || invoice.status === "PAID") throw new Error(invoice ? "Invoice is already paid." : "Invoice not found.");
  const staffAuthorized = session?.user && session.user.shopId === invoice.shopId && session.user.role !== "CUSTOMER";
  const portalAuthorized = Boolean(input.portal && invoice.estimate?.portalToken === input.portal);
  if (!staffAuthorized && !portalAuthorized) throw new Error("You are not authorized to pay this invoice.");
  const payment = await createPayment({ amount: Number(invoice.total), currency: "usd", invoiceId: invoice.id, description: invoice.invoiceNumber });
  if (payment.status !== "succeeded") throw new Error("Payment requires additional action.");
  await prisma.$transaction(async (tx) => {
    await tx.payment.create({ data: { shopId: invoice.shopId, invoiceId: invoice.id, amount: invoice.total, method: payment.provider === "demo" ? "Demo Visa •••• 4242" : "Stripe", provider: payment.provider, status: "SUCCEEDED", transactionId: payment.transactionId, processedAt: new Date() } });
    await tx.invoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date() } });
    await tx.repairOrder.update({ where: { id: invoice.repairOrderId }, data: { status: "CLOSED", completedAt: new Date() } });
    await tx.cRMFollowUp.create({ data: { shopId: invoice.shopId, customerId: invoice.customerId, vehicleId: invoice.vehicleId, repairOrderId: invoice.repairOrderId, type: "POST_REPAIR", title: "Post-repair check-in", details: `Follow up after paid invoice ${invoice.invoiceNumber}.`, dueAt: new Date(Date.now() + 3 * 86400000) } });
    await tx.notification.create({ data: { shopId: invoice.shopId, type: "PAYMENT", title: "Payment received", body: `${invoice.invoiceNumber} was paid in full.`, href: `/repair-orders/${invoice.repairOrderId}` } });
  });
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/crm");
  revalidatePath(`/repair-orders/${invoice.repairOrderId}`);
}

export async function sendMessage(formData: FormData) {
  const session = await requireStaff();
  const input = z.object({ customerId: idSchema, repairOrderId: idSchema.optional().or(z.literal("")), body: z.string().trim().min(1).max(2000) }).parse(Object.fromEntries(formData));
  const customer = await prisma.customer.findFirst({ where: { id: input.customerId, shopId: session.user.shopId } });
  if (!customer) throw new Error("Customer not found.");
  const receipt = await messagingProvider.send({ to: customer.phone, body: input.body, channel: "SMS" });
  await prisma.message.create({ data: { shopId: session.user.shopId, customerId: customer.id, repairOrderId: input.repairOrderId || null, senderId: session.user.id, channel: "SMS", direction: "OUTBOUND", body: input.body, providerId: receipt.providerId } });
  revalidatePath("/messages");
  if (input.repairOrderId) revalidatePath(`/repair-orders/${input.repairOrderId}`);
}

export async function generateFollowUpDraft(formData: FormData) {
  const session = await requireManager();
  const followUpId = idSchema.parse(formData.get("followUpId"));
  const followUp = await prisma.cRMFollowUp.findFirst({
    where: { id: followUpId, shopId: session.user.shopId },
    include: { customer: true, vehicle: true },
  });
  if (!followUp) throw new Error("Follow-up not found.");
  const result = await createFollowUp({
    customerName: followUp.customer.firstName,
    vehicle: followUp.vehicle ? `${followUp.vehicle.year} ${followUp.vehicle.make} ${followUp.vehicle.model}` : "vehicle",
    reason: followUp.title,
    verifiedDetails: followUp.details,
  });
  await prisma.cRMFollowUp.update({ where: { id: followUp.id }, data: { aiDraft: `${result.message} ${result.callToAction}` } });
  revalidatePath("/crm");
}

export async function createDemoReceptionistCall() {
  const session = await requireManager();
  const [customer, technician] = await Promise.all([
    prisma.customer.findFirst({
      where: { shopId: session.user.shopId, firstName: "Jordan", lastName: "Lee" },
      include: { vehicles: { where: { year: 2015, make: "Chevrolet", model: "Sonic" }, take: 1 } },
    }),
    prisma.user.findFirst({
      where: { shopId: session.user.shopId, role: "TECHNICIAN", isActive: true, specialties: { has: "Diagnostics" } },
    }),
  ]);
  const vehicle = customer?.vehicles[0];
  if (!customer || !vehicle || !technician) throw new Error("Demo customer, vehicle, or technician is unavailable.");

  const analysis = await extractCallIntake(demoCallTranscript);
  const preferred = new Date();
  preferred.setDate(preferred.getDate() + 1);
  preferred.setHours(8, 0, 0, 0);
  const possibleHours = [8, 9, 10, 11, 13, 14, 15, 16];
  let scheduledAt = preferred;
  for (const hour of possibleHours) {
    const candidate = new Date(preferred);
    candidate.setHours(hour, 0, 0, 0);
    const conflict = await prisma.appointment.count({
      where: {
        shopId: session.user.shopId,
        technicianId: technician.id,
        scheduledAt: { gte: candidate, lt: new Date(candidate.getTime() + 60 * 60000) },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    });
    if (!conflict) {
      scheduledAt = candidate;
      break;
    }
  }

  const call = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({
      data: {
        shopId: session.user.shopId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        technicianId: technician.id,
        scheduledAt,
        durationMin: 60,
        serviceType: analysis.intake.serviceType,
        complaint: analysis.intake.complaint,
        status: "CONFIRMED",
        notes: `Automatically booked from AI receptionist call. Intake source: ${analysis.source}.`,
      },
    });
    const conversation = await tx.aIConversation.create({
      data: {
        shopId: session.user.shopId,
        customerId: customer.id,
        type: "RECEPTIONIST_CALL",
        title: `Incoming call · ${customer.firstName} ${customer.lastName}`,
        messages: {
          create: demoCallTranscript.map((message) => ({
            role: message.role,
            content: message.content,
            structuredData: message.role === "assistant" ? { channel: "voice", assistant: "Ava" } : { channel: "voice" },
          })),
        },
      },
    });
    const created = await tx.callRecord.create({
      data: {
        shopId: session.user.shopId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        appointmentId: appointment.id,
        conversationId: conversation.id,
        callerName: `${customer.firstName} ${customer.lastName}`,
        callerPhone: customer.phone,
        status: "COMPLETED",
        outcome: "APPOINTMENT_BOOKED",
        durationSec: 143,
        sentiment: "Concerned, cooperative",
        summary: analysis.intake.summary,
        extractedDetails: { ...analysis.intake, source: analysis.source, assignedTechnician: technician.name },
        endedAt: new Date(),
      },
    });
    await tx.message.create({
      data: {
        shopId: session.user.shopId,
        customerId: customer.id,
        direction: "OUTBOUND",
        channel: "SMS",
        body: `Confirmed: ${analysis.intake.serviceType} for your ${vehicle.year} ${vehicle.make} ${vehicle.model} on ${scheduledAt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. Reply C to confirm or call us with questions.`,
        providerId: `mock_${crypto.randomUUID()}`,
      },
    });
    await tx.notification.create({
      data: {
        shopId: session.user.shopId,
        type: "APPOINTMENT",
        title: "AI receptionist booked an appointment",
        body: `${customer.firstName} ${customer.lastName} · ${vehicle.year} ${vehicle.make} ${vehicle.model} · ${scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
        href: `/calls/${created.id}`,
      },
    });
    return created;
  });
  revalidatePath("/");
  revalidatePath("/appointments");
  revalidatePath("/calls");
  revalidatePath("/crm");
  redirect(`/calls/${call.id}`);
}
