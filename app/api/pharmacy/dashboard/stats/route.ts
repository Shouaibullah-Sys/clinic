import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  const payload = await getTokenPayload(req);

  if (!payload || !((payload.role === "pharmacist" || payload.role === "pharmacy_head") || payload.role === "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const pendingPrescriptions = await prisma.prescription.count({
      where: {
        status: { in: ["active", "pending"] },
        dispensingStatus: { in: ["pending", "partial"] },
      },
    });

    const lowStockMedicines = await prisma.medicineStock.count({
      where: {
        currentQty: { lt: 10 },
      },
    });

    const dispensedToday = await prisma.prescription.count({
      where: {
        dispensingStatus: "full",
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const prescriptionsToday = await prisma.prescription.findMany({
      where: {
        dispensingStatus: "full",
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const totalRevenue = prescriptionsToday.reduce((total, prescription) => {
      const medications = JSON.parse(prescription.medications || "[]") as any[] || [];
      const prescriptionTotal = medications.reduce(
        (medTotal, med) => {
          return medTotal + (med.quantity || 0) * (med.unitPrice || 0);
        },
        0,
      );
      return total + prescriptionTotal;
    }, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activePatientPrescriptions = await prisma.prescription.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        patientId: true,
      },
    });

    const uniquePatientIds = [...new Set(activePatientPrescriptions.map((p) => p.patientId))];

    return NextResponse.json({
      success: true,
      data: {
        pendingPrescriptions,
        lowStockMedicines,
        dispensedToday,
        totalRevenue: Math.round(totalRevenue),
        activePatients: uniquePatientIds.length,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 },
    );
  }
}