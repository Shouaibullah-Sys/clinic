import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);

    if (!payload || !["admin", "pharmacy_head"].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "20");

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "Query must be at least 2 characters",
      });
    }

    const warehouseMedicines = await prisma.warehouse.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { genericName: { contains: query } },
          { manufacturer: { contains: query } },
        ],
        isActive: true,
      },
      select: { id: true, name: true, genericName: true, category: true, manufacturer: true },
      take: limit,
    });

    if (warehouseMedicines.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "No medicines found",
      });
    }

    const warehouseIds = warehouseMedicines.map((w) => w.id);
    const batches = await prisma.warehouseBatch.findMany({
      where: {
        warehouseId: { in: warehouseIds },
        status: { in: ["available", "partial"] },
      },
      include: {
        warehouse: { select: { id: true, name: true, genericName: true, category: true, manufacturer: true } },
      },
      orderBy: { expiryDate: "asc" },
    });

    const result = warehouseMedicines.map((medicine) => {
      const medicineBatches = batches.filter(
        (b) => b.warehouseId === medicine.id,
      );

      return {
        ...medicine,
        availableBatches: medicineBatches.map((batch) => ({
          id: batch.id,
          batchId: batch.batchId,
          batchNumber: batch.batchNumber,
          lotNumber: batch.lotNumber,
          form: batch.form,
          dosage: batch.dosage,
          frequency: batch.frequency,
          route: batch.route,
          expiryDate: batch.expiryDate,
          quantity: batch.quantity,
          originalQuantity: batch.originalQuantity,
          unitCost: batch.unitCost,
          supplier: batch.supplier,
          status: batch.status,
          remainingPercentage: batch.originalQuantity ? (batch.quantity / batch.originalQuantity) * 100 : 0,
        })),
        totalAvailableQuantity: medicineBatches.reduce(
          (sum, b) => sum + b.quantity,
          0,
        ),
      };
    });

    const availableMedicines = result.filter(
      (m) => m.availableBatches.length > 0,
    );

    return NextResponse.json({
      success: true,
      data: availableMedicines,
      count: availableMedicines.length,
    });
  } catch (error: any) {
    console.error("Error searching warehouse:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to search warehouse",
      },
      { status: 500 },
    );
  }
}