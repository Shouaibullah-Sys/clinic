import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const payload = await getTokenPayload(req);

    if (
      !payload ||
      !(
        payload.role === "admin" ||
        (payload.role === "pharmacist" || payload.role === "pharmacy_head") ||
        payload.role === "doctor"
      )
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const now = new Date();

    const medicines = await prisma.medicineStock.findMany({
      where: {
        AND: [
          search.trim()
            ? { name: { contains: search } }
            : {},
          { currentQty: { gt: 0 } },
          { expiryDate: { gt: now } },
        ],
      },
      orderBy: [{ name: "asc" }, { currentQty: "desc" }],
      take: limit,
    });

    const enhancedMedicines = medicines.map((medicine) =>
      enhanceMedicineData(medicine),
    );

    return NextResponse.json({
      success: true,
      data: enhancedMedicines,
      total: medicines.length,
    });
  } catch (error: any) {
    console.error("Error searching medicines:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to search medicines",
        data: [],
      },
      { status: 500 },
    );
  }
}

function enhanceMedicineData(medicine: any) {
  const today = new Date();
  const expiryDate = medicine.expiryDate ? new Date(medicine.expiryDate) : null;
  const remainingPercentage =
    medicine.totalQty > 0
      ? (medicine.currentQty / medicine.totalQty) * 100
      : 0;
  const isLowStock = medicine.currentQty <= 20;
  const isExpiringSoon =
    expiryDate && expiryDate.getTime() - today.getTime() <= 30 * 24 * 60 * 60 * 1000;

  return {
    ...medicine,
    id: medicine.id,
    remainingPercentage: Math.round(remainingPercentage),
    isLowStock,
    isExpiringSoon,
    status: isLowStock
      ? "low-stock"
      : isExpiringSoon
        ? "expiring-soon"
        : "available",
    daysToExpiry: expiryDate
      ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null,
  };
}