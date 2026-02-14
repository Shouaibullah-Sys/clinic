// app/api/warehouse/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { WarehouseBatch } from "@/lib/models/WarehouseBatch";
import { Warehouse } from "@/lib/models/Warehouse";
import { getTokenPayload } from "@/lib/auth/jwt";

// GET: Search warehouse medicines with available batches for transfer
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
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

    const searchRegex = new RegExp(query, "i");

    // Find warehouse medicines matching the search
    const warehouseMedicines = await Warehouse.find({
      $or: [
        { name: searchRegex },
        { genericName: searchRegex },
        { manufacturer: searchRegex },
      ],
      isActive: true,
    })
      .select("_id name genericName category manufacturer")
      .limit(limit)
      .lean();

    if (warehouseMedicines.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "No medicines found",
      });
    }

    // Get available batches for each warehouse medicine
    const warehouseIds = warehouseMedicines.map((w) => w._id);
    const batches = await WarehouseBatch.find({
      warehouse: { $in: warehouseIds },
      status: { $in: ["available", "partial"] },
    })
      .populate("warehouse", "name genericName category manufacturer")
      .sort({ expiryDate: 1 })
      .lean();

    // Group batches by warehouse medicine
    const result = warehouseMedicines.map((medicine: any) => {
      const medicineBatches = batches.filter(
        (b) => b.warehouse._id.toString() === medicine._id.toString(),
      );

      return {
        ...medicine,
        availableBatches: medicineBatches.map((batch) => ({
          _id: batch._id,
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
          remainingPercentage: (batch.quantity / batch.originalQuantity) * 100,
        })),
        totalAvailableQuantity: medicineBatches.reduce(
          (sum, b) => sum + b.quantity,
          0,
        ),
      };
    });

    // Filter out medicines with no available batches
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
