// app/api/pharmacy/issued-items/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const payload = await getTokenPayload(req);

    if (
      !payload ||
      !(payload.role === "admin" || (payload.role === "pharmacist" || payload.role === "pharmacy_head"))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    let dateFilter: any = {};
    if (dateParam) {
      const filterDate = new Date(dateParam);
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);

      dateFilter = {
        issueDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    const issues = await (prisma as any).medicineIssue.findMany({
      where: dateFilter,
      orderBy: { issueDate: "desc" },
      include: {
        medicine: { select: { name: true, form: true, dosage: true, currentQty: true, totalQty: true, costPrice: true } },
      },
    });

    const issuedItems = issues.map((issue: any) => {
      const medicine = issue.medicine || {};
      const unitPrice = medicine.costPrice || 0;
      const quantity = issue.quantity || 0;
      const totalPrice = unitPrice * quantity;

      return {
        id: issue.id,
        medicineId: medicine.id || "",
        name: medicine.name || "Unknown Medicine",
        form: medicine.form || "N/A",
        dosage: medicine.dosage || "N/A",
        quantityIssued: quantity,
        currentStock: medicine.currentQty || 0,
        originalStock: medicine.totalQty || 0,
        issueDate: issue.issueDate,
        issuedTo: issue.issuedTo || "Unknown",
        issuedBy: issue.issuedBy || "Unknown",
        unitPrice,
        totalPrice,
        prescriptionId: issue.prescriptionId || undefined,
      };
    });

    return NextResponse.json({
      issuedItems,
      pagination: {
        total: issuedItems.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching issued items:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch issued items" },
      { status: 500 },
    );
  }
}