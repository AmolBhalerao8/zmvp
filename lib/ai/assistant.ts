import { prisma } from "@/lib/db/prisma";
import { humanize } from "@/lib/utils";

export async function answerShopQuestion(shopId: string, question: string) {
  const normalized = question.toLowerCase();

  if (normalized.includes("approval")) {
    const orders = await prisma.repairOrder.findMany({
      where: { shopId, status: "AWAITING_APPROVAL" },
      include: { customer: true, vehicle: true },
      take: 20,
    });
    return {
      title: "Waiting for approval",
      answer: orders.length
        ? orders.map((ro) => `${ro.roNumber} · ${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model} · ${ro.customer.firstName} ${ro.customer.lastName}`).join("\n")
        : "No repair orders are currently waiting for approval.",
      links: orders.map((ro) => ({ label: ro.roNumber, href: `/repair-orders/${ro.id}` })),
    };
  }

  if (normalized.includes("tomorrow") || normalized.includes("coming")) {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const appointments = await prisma.appointment.findMany({
      where: { shopId, scheduledAt: { gte: start, lt: end } },
      include: { customer: true, vehicle: true },
      orderBy: { scheduledAt: "asc" },
    });
    return {
      title: "Tomorrow's appointments",
      answer: appointments.length
        ? appointments.map((item) => `${item.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · ${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model} · ${item.serviceType}`).join("\n")
        : "There are no appointments scheduled tomorrow.",
      links: [{ label: "Open appointments", href: "/appointments" }],
    };
  }

  if (normalized.includes("part")) {
    const parts = await prisma.part.findMany({
      where: { shopId, status: { in: ["NEEDED", "REQUESTED", "ORDERED"] } },
      include: { repairOrder: { include: { vehicle: true } } },
      take: 25,
    });
    return {
      title: "Open parts",
      answer: parts.length
        ? parts.map((part) => `${part.name} · ${part.repairOrder.roNumber} · ${humanize(part.status)}`).join("\n")
        : "No parts are currently needed or on order.",
      links: [{ label: "Open parts board", href: "/parts" }],
    };
  }

  if (normalized.includes("technician") || normalized.includes("workload")) {
    const technicians = await prisma.user.findMany({
      where: { shopId, role: "TECHNICIAN", isActive: true },
      include: { _count: { select: { repairOrders: { where: { status: { notIn: ["COMPLETED", "CLOSED"] } } } } } },
      orderBy: { repairOrders: { _count: "desc" } },
    });
    return {
      title: "Technician workload",
      answer: technicians.map((tech) => `${tech.name} · ${tech._count.repairOrders} active repair orders`).join("\n"),
      links: [{ label: "Open technician board", href: "/technicians" }],
    };
  }

  if (normalized.includes("declined")) {
    const followUps = await prisma.cRMFollowUp.findMany({
      where: { shopId, type: "DECLINED_SERVICE", status: { in: ["OPEN", "SCHEDULED"] } },
      include: { customer: true, vehicle: true },
      take: 20,
    });
    return {
      title: "Declined services",
      answer: followUps.length
        ? followUps.map((item) => `${item.customer.firstName} ${item.customer.lastName} · ${item.vehicle?.year} ${item.vehicle?.make} ${item.vehicle?.model} · ${item.details}`).join("\n")
        : "No open declined-service follow-ups.",
      links: [{ label: "Open CRM", href: "/crm" }],
    };
  }

  return {
    title: "Try a shop question",
    answer: "I can safely answer questions about approvals, tomorrow's appointments, parts, technician workload, and declined services.",
    links: [],
  };
}
