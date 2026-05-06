// app/api/pharmacy/inventory/low-stock/route.ts
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
    const lowStockItems = await (prisma as any).medicineStock.findMany({
      where: {
        currentQty: { gt: 0 },
        totalQty: { gt: 0 },
      },
    });

    const result = lowStockItems
      .filter((item: any) => {
        const ratio = item.currentQty / item.totalQty;
        return ratio > 0 && ratio < 0.2;
      })
      .map((item: any) => {
        const percentage = (item.currentQty / item.totalQty) * 100;
        return {
          id: item.id,
          name: item.name,
          form: item.form,
          dosage: item.dosage,
          frequency: item.frequency,
          route: item.route,
          currentQuantity: item.currentQty,
          originalQuantity: item.totalQty,
          remainingPercentage: parseFloat(percentage.toFixed(2)),
        };
      });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Detailed error in low-stock endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch low stock items",
        details: error.message,
      },
      { status: 500 },
    );
  }
}