// app/api/pharmacy/medicines/[id]/stock/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(req);
    if (
      !payload ||
      !(
        (payload.role === "pharmacist" || payload.role === "pharmacy_head") ||
        payload.role === "admin" ||
        payload.role === "doctor"
      )
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    let medicine = await (prisma as any).medicineStock.findUnique({
      where: { id },
    });

    if (!medicine) {
      medicine = await (prisma as any).medicineStock.findFirst({
        where: { name: { equals: id, mode: "insensitive" } },
      });
    }

    if (!medicine) {
      return NextResponse.json(
        { error: "Medicine not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: medicine.id,
        name: medicine.name,
        form: medicine.form,
        dosage: medicine.dosage,
        frequency: medicine.frequency,
        route: medicine.route,
        currentQuantity: medicine.currentQty,
        originalQuantity: medicine.totalQty,
        unitPrice: medicine.costPrice,
        sellingPrice: medicine.sellPrice,
        expiryDate: medicine.expiryDate,
        supplier: medicine.supplier,
        description: medicine.description,
        remainingPercentage: medicine.totalQty > 0 ? Math.round((medicine.currentQty / medicine.totalQty) * 100) : 0,
        isLowStock: medicine.currentQty <= 10,
        isExpiringSoon: medicine.expiryDate && new Date(medicine.expiryDate).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000,
      },
    });
  } catch (error: any) {
    console.error("Error fetching medicine:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch medicine" },
      { status: 500 },
    );
  }
}