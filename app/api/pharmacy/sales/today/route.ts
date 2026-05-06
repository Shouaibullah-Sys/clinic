// app/api/pharmacy/sales/today/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  const payload = await getTokenPayload(req);

  if (
    !payload ||
    !(payload.role === "admin" || (payload.role === "pharmacist" || payload.role === "pharmacy_head"))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get start and end of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's prescriptions
    const prescriptions = await prisma.prescription.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        status: "completed",
      },
    });

    // Calculate sales by payment method
    const salesData = prescriptions.reduce(
      (acc, prescription) => {
        const charges = JSON.parse(prescription.charges || "{}");
        acc.totalSales += charges.totalAmount || 0;

        if (charges.paymentMethod === "cash") {
          acc.cashSales += charges.totalAmount || 0;
        } else if (charges.paymentMethod === "card") {
          acc.cardSales += charges.totalAmount || 0;
        } else if (charges.paymentMethod === "insurance") {
          acc.insuranceSales += charges.totalAmount || 0;
        }

        return acc;
      },
      {
        totalSales: 0,
        cashSales: 0,
        cardSales: 0,
        insuranceSales: 0,
      },
    );

    return NextResponse.json(salesData);
  } catch (error) {
    console.error("Failed to fetch today's sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch today's sales" },
      { status: 500 },
    );
  }
}
