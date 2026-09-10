import {
  AppointmentStatus,
  EstimateStatus,
  InspectionRating,
  InvoiceStatus,
  PartStatus,
  PaymentStatus,
  PrismaClient,
  RepairOrderStatus,
  UserRole,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const day = (offset: number, hour = 9) => {
  const value = new Date();
  value.setDate(value.getDate() + offset);
  value.setHours(hour, 0, 0, 0);
  return value;
};

async function main() {
  await prisma.shop.deleteMany({ where: { email: "hello@zolmotorworks.com" } });
  const passwordHash = await hash("ZolDemo123!", 12);

  const shop = await prisma.shop.create({
    data: {
      name: "ZOL Motorworks",
      address: "1840 Esplanade, Chico, CA 95926",
      phone: "(530) 555-0147",
      email: "hello@zolmotorworks.com",
      taxRate: 8.25,
    },
  });

  const [owner, manager, techA, techB] = await Promise.all([
    prisma.user.create({ data: { shopId: shop.id, name: "Amol Bhalerao", email: "owner@zol.demo", passwordHash, role: UserRole.OWNER } }),
    prisma.user.create({ data: { shopId: shop.id, name: "Maya Chen", email: "manager@zol.demo", passwordHash, role: UserRole.MANAGER } }),
    prisma.user.create({ data: { shopId: shop.id, name: "Marcus Reed", email: "tech@zol.demo", passwordHash, role: UserRole.TECHNICIAN, specialties: ["Diagnostics", "Electrical"] } }),
    prisma.user.create({ data: { shopId: shop.id, name: "Elena Torres", email: "elena@zol.demo", passwordHash, role: UserRole.TECHNICIAN, specialties: ["Brakes", "Suspension"] } }),
  ]);

  const customerData = [
    ["Jordan", "Lee", "(530) 555-0171", "jordan@demo.test"],
    ["Priya", "Shah", "(530) 555-0192", "priya@demo.test"],
    ["Daniel", "Brooks", "(530) 555-0136", "daniel@demo.test"],
    ["Sofia", "Martinez", "(530) 555-0188", "sofia@demo.test"],
    ["Ethan", "Walker", "(530) 555-0115", "ethan@demo.test"],
    ["Nina", "Patel", "(530) 555-0162", "nina@demo.test"],
    ["Liam", "Nguyen", "(530) 555-0144", "liam@demo.test"],
    ["Grace", "Kim", "(530) 555-0120", "grace@demo.test"],
  ] as const;

  const customers = await Promise.all(
    customerData.map(([firstName, lastName, phone, email]) =>
      prisma.customer.create({
        data: { shopId: shop.id, firstName, lastName, phone, email, address: `${100 + Math.floor(Math.random() * 800)} Cypress Ave, Chico, CA`, preferredContact: "SMS" },
      }),
    ),
  );

  await prisma.user.create({
    data: { shopId: shop.id, customerId: customers[0].id, name: "Jordan Lee", email: "customer@zol.demo", passwordHash, role: UserRole.CUSTOMER },
  });

  const vehicleSpecs = [
    [0, 2015, "Chevrolet", "Sonic", "LT", "1.8L I4", 102430, "8ABC123", "1G1JC5SH0F4100001"],
    [1, 2014, "Jeep", "Compass", "Latitude", "2.4L I4", 128205, "7JEP442", "1C4NJDEB0ED100002"],
    [2, 2019, "Toyota", "Camry", "SE", "2.5L I4", 68420, "8CAM919", "4T1B11HK0KU100003"],
    [3, 2020, "Honda", "CR-V", "EX", "1.5L Turbo", 44980, "9CRV205", "2HKRW2H50LH100004"],
    [4, 2018, "Ford", "F-150", "XLT", "3.5L EcoBoost", 89730, "8F15077", "1FTFW1EG0JFA00005"],
    [5, 2022, "Subaru", "Outback", "Premium", "2.5L H4", 31200, "9SUB212", "4S4BTACC0N3100006"],
    [6, 2017, "Nissan", "Altima", "SV", "2.5L I4", 91500, "7ALT717", "1N4AL3AP0HC100007"],
    [7, 2021, "Mazda", "CX-5", "Touring", "2.5L I4", 38770, "9MAZ551", "JM3KFBCM0M0100008"],
    [0, 2012, "Honda", "Civic", "LX", "1.8L I4", 146110, "6CIV204", "2HGFB2F50CH100009"],
    [3, 2016, "Volkswagen", "Golf", "S", "1.8L Turbo", 78200, "7VW4300", "3VW217AU0GM100010"],
  ] as const;

  const vehicles = await Promise.all(
    vehicleSpecs.map(([customerIndex, year, make, model, trim, engine, mileage, licensePlate, vin]) =>
      prisma.vehicle.create({ data: { shopId: shop.id, customerId: customers[customerIndex].id, year, make, model, trim, engine, mileage, licensePlate, vin } }),
    ),
  );

  const appointmentSpecs: Array<[number, number, number, string, string, AppointmentStatus]> = [
    [0, 0, 8, "Diagnostics", "Check engine light is on and vehicle shakes at idle.", AppointmentStatus.CHECKED_IN],
    [1, 0, 10, "Engine diagnostics", "Intermittent stalling; possible MAP sensor concern.", AppointmentStatus.IN_PROGRESS],
    [2, 0, 11, "Brake service", "Squealing under light braking and long pedal travel.", AppointmentStatus.CONFIRMED],
    [3, 0, 13, "Routine maintenance", "Oil service, tire rotation, and multipoint inspection.", AppointmentStatus.SCHEDULED],
    [4, 0, 15, "Suspension", "Clunk over bumps from front passenger side.", AppointmentStatus.SCHEDULED],
    [5, 1, 8, "30k maintenance", "Factory scheduled maintenance.", AppointmentStatus.CONFIRMED],
    [6, 1, 10, "Cooling system", "Temperature gauge rises in traffic.", AppointmentStatus.SCHEDULED],
    [7, 1, 13, "Inspection", "Pre-trip inspection.", AppointmentStatus.SCHEDULED],
    [8, 2, 9, "Oil service", "Oil and filter service.", AppointmentStatus.SCHEDULED],
    [9, 2, 11, "Check engine", "Check engine light came on yesterday.", AppointmentStatus.SCHEDULED],
    [2, -1, 14, "Brake inspection", "Front brake noise.", AppointmentStatus.COMPLETED],
    [4, -2, 9, "Alignment", "Steering wheel off center.", AppointmentStatus.COMPLETED],
  ];

  const appointments = await Promise.all(
    appointmentSpecs.map(([vehicleIndex, offset, hour, serviceType, complaint, status], index) =>
      prisma.appointment.create({
        data: {
          shopId: shop.id,
          customerId: customers[vehicleSpecs[vehicleIndex][0]].id,
          vehicleId: vehicles[vehicleIndex].id,
          technicianId: index % 2 ? techA.id : techB.id,
          scheduledAt: day(offset, hour),
          durationMin: 60,
          serviceType,
          complaint,
          status,
        },
      }),
    ),
  );

  const callConversation = await prisma.aIConversation.create({
    data: {
      shopId: shop.id,
      customerId: customers[0].id,
      type: "RECEPTIONIST_CALL",
      title: "Incoming call · Jordan Lee",
    },
  });
  const callStarted = day(-1, 16);
  const callTranscript = [
    ["assistant", "Thank you for calling ZOL Motorworks. I’m Ava, the AI service receptionist. How can I help today?"],
    ["customer", "Hi, this is Jordan Lee. My 2015 Chevy Sonic has a check engine light and it shakes when I’m stopped."],
    ["assistant", "I can help arrange diagnostics. Is the light steady or flashing, and have you noticed stalling, overheating, or a loss of power?"],
    ["customer", "It stays on steadily. No overheating or stalling, but it feels weaker than normal."],
    ["assistant", "Thank you. A steady light with rough running should be inspected soon. If it begins flashing or loses significant power, please stop driving. Would tomorrow morning work?"],
    ["customer", "Yes, the earliest appointment tomorrow would be great."],
    ["assistant", "I found your Sonic and an 8:00 AM diagnostic opening with Marcus. I’ll book it and text the confirmation now."],
  ] as const;
  for (let index = 0; index < callTranscript.length; index++) {
    await prisma.aIMessage.create({
      data: {
        conversationId: callConversation.id,
        role: callTranscript[index][0],
        content: callTranscript[index][1],
        structuredData: { channel: "voice", sequence: index + 1 },
        createdAt: new Date(callStarted.getTime() + index * 18000),
      },
    });
  }
  await prisma.callRecord.create({
    data: {
      shopId: shop.id,
      customerId: customers[0].id,
      vehicleId: vehicles[0].id,
      appointmentId: appointments[0].id,
      conversationId: callConversation.id,
      callerName: "Jordan Lee",
      callerPhone: customers[0].phone,
      status: "COMPLETED",
      outcome: "APPOINTMENT_BOOKED",
      durationSec: 143,
      sentiment: "Concerned, cooperative",
      summary: "Returning customer reported a steady check-engine light, shaking at idle, and reduced power. Ava matched the vehicle, provided conservative safety guidance, found diagnostic availability, booked the visit, and sent confirmation.",
      extractedDetails: {
        customerName: "Jordan Lee",
        phone: customers[0].phone,
        vehicle: { year: 2015, make: "Chevrolet", model: "Sonic" },
        complaint: "Check engine light with shaking at idle",
        symptoms: ["Check engine light", "Rough idle", "Shaking while stopped", "Reduced power"],
        urgency: "SOON",
        serviceType: "Check-engine diagnostics",
        preferredTime: "Earliest morning appointment",
        safetyAdvice: "Stop driving if the check-engine light flashes or the vehicle loses significant power.",
        source: "structured AI",
        assignedTechnician: techA.name,
      },
      startedAt: callStarted,
      endedAt: new Date(callStarted.getTime() + 143000),
    },
  });

  const roSpecs: Array<[number, string, RepairOrderStatus, string, number]> = [
    [0, "RO-1048", RepairOrderStatus.DIAGNOSING, "Check engine light and shaking at idle.", 102430],
    [1, "RO-1047", RepairOrderStatus.AWAITING_APPROVAL, "Stalling and hesitation under acceleration.", 128205],
    [2, "RO-1046", RepairOrderStatus.WAITING_FOR_PARTS, "Brake squeal and reduced pad life.", 68420],
    [4, "RO-1045", RepairOrderStatus.IN_REPAIR, "Front suspension clunk over uneven roads.", 89730],
    [3, "RO-1044", RepairOrderStatus.READY_FOR_PICKUP, "Routine maintenance and inspection.", 44980],
    [6, "RO-1043", RepairOrderStatus.QUALITY_CHECK, "Cooling system runs hot at idle.", 91500],
    [7, "RO-1042", RepairOrderStatus.COMPLETED, "Pre-trip safety inspection.", 38770],
  ];

  const repairOrders = [];
  for (let i = 0; i < roSpecs.length; i++) {
    const [vehicleIndex, roNumber, status, complaint, mileageIn] = roSpecs[i];
    const customer = customers[vehicleSpecs[vehicleIndex][0]];
    repairOrders.push(
      await prisma.repairOrder.create({
        data: {
          shopId: shop.id,
          appointmentId: i < 5 ? appointments[i].id : undefined,
          customerId: customer.id,
          vehicleId: vehicles[vehicleIndex].id,
          technicianId: i % 2 ? techA.id : techB.id,
          roNumber,
          complaint,
          mileageIn,
          fuelLevel: 55 + i * 5,
          checkedInAt: day(-i, 8),
          status,
          promisedAt: day(i < 4 ? 0 : 1, 17),
        },
      }),
    );
  }

  const sonicRo = repairOrders[0];
  await prisma.diagnostic.create({
    data: {
      shopId: shop.id,
      repairOrderId: sonicRo.id,
      vehicleId: vehicles[0].id,
      technicianId: techA.id,
      obdCodes: ["P0301", "P0171"],
      symptoms: "Rough idle, shaking, reduced power, check engine light",
      observations: "Misfire counter highest on cylinder 1. Fuel trims +18% at idle.",
      aiStatus: "COMPLETED",
      aiResult: {
        causes: [
          { title: "Vacuum leak near cylinder 1", confidence: 78, explanation: "High positive fuel trim at idle supports unmetered air." },
          { title: "Ignition coil or spark plug fault", confidence: 72, explanation: "Cylinder-specific misfire and rough idle are consistent." },
          { title: "Fuel injector restriction", confidence: 44, explanation: "Possible if ignition and intake tests pass." },
        ],
        steps: ["Smoke-test intake system", "Swap cylinder 1 ignition coil", "Inspect spark plug", "Run injector balance test"],
        warning: "AI-assisted diagnostic recommendation — technician verification required.",
      },
    },
  });

  const inspectionCategories = ["Engine", "Transmission", "Brakes", "Tires", "Suspension", "Steering", "Battery", "Fluids", "Lights", "HVAC", "Exterior", "Interior", "Safety"];
  for (let r = 0; r < 4; r++) {
    const ro = repairOrders[r];
    const inspection = await prisma.inspection.create({
      data: {
        shopId: shop.id,
        repairOrderId: ro.id,
        vehicleId: ro.vehicleId,
        technicianId: r % 2 ? techA.id : techB.id,
        title: "Digital Vehicle Inspection",
        overallRating: r === 2 ? InspectionRating.RED : InspectionRating.YELLOW,
        completedAt: day(-r, 11),
        aiSummary: r === 0 ? "The engine requires diagnostic attention for an active misfire. Front tires show moderate wear; other inspected safety systems are serviceable." : undefined,
      },
    });
    await prisma.inspectionItem.createMany({
      data: inspectionCategories.map((category, index) => ({
        inspectionId: inspection.id,
        category,
        name: `${category} condition`,
        rating: index === r + 2 ? InspectionRating.RED : index % 5 === 0 ? InspectionRating.YELLOW : InspectionRating.GREEN,
        notes: index === r + 2 ? "Service recommended based on technician inspection." : "Checked and serviceable.",
        sortOrder: index,
      })),
    });
  }

  for (let r = 1; r < 6; r++) {
    const ro = repairOrders[r];
    const labor = 145 + r * 42;
    const parts = 95 + r * 63;
    const subtotal = labor + parts;
    const tax = Number((parts * 0.0825).toFixed(2));
    const approved = r >= 2;
    const estimate = await prisma.estimate.create({
      data: {
        shopId: shop.id,
        repairOrderId: ro.id,
        customerId: ro.customerId,
        vehicleId: ro.vehicleId,
        estimateNumber: `EST-${2048 - r}`,
        status: approved ? EstimateStatus.APPROVED : EstimateStatus.SENT,
        subtotal,
        tax,
        discount: 0,
        total: subtotal + tax,
        sentAt: day(-r, 12),
        viewedAt: day(-r, 13),
        respondedAt: approved ? day(-r, 14) : undefined,
        items: {
          create: [
            { type: "LABOR", description: r === 2 ? "Front brake service labor" : "Diagnostic and repair labor", quantity: 1, unitPrice: labor, total: labor, approvalStatus: approved ? "APPROVED" : "PENDING" },
            { type: "PART", description: r === 2 ? "Premium front brake pad set" : "OE-quality replacement component", quantity: 1, unitPrice: parts, total: parts, approvalStatus: approved ? "APPROVED" : "PENDING" },
          ],
        },
      },
    });

    await prisma.part.create({
      data: {
        shopId: shop.id,
        repairOrderId: ro.id,
        name: r === 2 ? "Akebono front brake pad set" : "OE-quality replacement component",
        partNumber: `ZOL-${8100 + r}`,
        supplier: r % 2 ? "NAPA AutoCare" : "WorldPac",
        quantity: 1,
        unitCost: parts * 0.62,
        unitPrice: parts,
        status: r === 2 ? PartStatus.ORDERED : r >= 3 ? PartStatus.RECEIVED : PartStatus.NEEDED,
        orderedAt: r >= 2 ? day(-1, 10) : undefined,
        receivedAt: r >= 3 ? day(0, 9) : undefined,
      },
    });
    await prisma.repairLabor.create({
      data: { repairOrderId: ro.id, technicianId: r % 2 ? techA.id : techB.id, description: "Approved repair labor", hours: 1 + r * 0.3, rate: 145, completed: r >= 4 },
    });

    if (r >= 4) {
      const invoice = await prisma.invoice.create({
        data: {
          shopId: shop.id,
          repairOrderId: ro.id,
          estimateId: estimate.id,
          customerId: ro.customerId,
          vehicleId: ro.vehicleId,
          invoiceNumber: `INV-${3048 - r}`,
          status: r === 5 ? InvoiceStatus.PAID : InvoiceStatus.OPEN,
          subtotal,
          tax,
          total: subtotal + tax,
          paidAt: r === 5 ? day(-1, 16) : undefined,
          items: { create: [
            { type: "LABOR", description: "Repair labor", quantity: 1, unitPrice: labor, total: labor },
            { type: "PART", description: "Replacement component", quantity: 1, unitPrice: parts, total: parts },
          ] },
        },
      });
      if (r === 5) {
        await prisma.payment.create({ data: { shopId: shop.id, invoiceId: invoice.id, amount: subtotal + tax, method: "Visa •••• 4242", provider: "demo", status: PaymentStatus.SUCCEEDED, transactionId: "demo_pay_3043", processedAt: day(-1, 16) } });
      }
    }
  }

  await prisma.message.createMany({
    data: [
      { shopId: shop.id, customerId: customers[0].id, repairOrderId: sonicRo.id, senderId: manager.id, direction: "OUTBOUND", channel: "SMS", body: "Hi Jordan — your Sonic is checked in and Marcus has started diagnostics." },
      { shopId: shop.id, customerId: customers[0].id, repairOrderId: sonicRo.id, direction: "INBOUND", channel: "SMS", body: "Thanks! Please let me know before doing any work over $500." },
      { shopId: shop.id, customerId: customers[2].id, repairOrderId: repairOrders[2].id, senderId: manager.id, direction: "OUTBOUND", channel: "SMS", body: "Your brake parts have been ordered. We expect them this afternoon." },
    ],
  });

  await prisma.cRMFollowUp.createMany({
    data: [
      { shopId: shop.id, customerId: customers[1].id, vehicleId: vehicles[1].id, repairOrderId: repairOrders[1].id, type: "DECLINED_SERVICE", title: "Follow up: throttle body service", details: "Customer deferred cleaning recommended during MAP diagnosis.", dueAt: day(14) },
      { shopId: shop.id, customerId: customers[3].id, vehicleId: vehicles[3].id, repairOrderId: repairOrders[4].id, type: "POST_REPAIR", title: "CR-V post-service check-in", details: "Confirm customer is satisfied after routine maintenance.", dueAt: day(3) },
      { shopId: shop.id, customerId: customers[6].id, vehicleId: vehicles[6].id, type: "MAINTENANCE_DUE", title: "Cooling system follow-up", details: "Schedule cooling system recheck in 30 days.", dueAt: day(30) },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { shopId: shop.id, userId: owner.id, type: "ESTIMATE", title: "Estimate viewed", body: "Priya viewed EST-2047.", href: "/estimates" },
      { shopId: shop.id, userId: owner.id, type: "PART", title: "Part received", body: "F-150 suspension component was received.", href: "/parts" },
      { shopId: shop.id, userId: owner.id, type: "REPAIR", title: "Vehicle ready", body: "2020 Honda CR-V is ready for pickup.", href: `/repair-orders/${repairOrders[4].id}` },
    ],
  });

  console.log(`Seeded ${shop.name}`);
  console.log("Demo login: owner@zol.demo / ZolDemo123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
