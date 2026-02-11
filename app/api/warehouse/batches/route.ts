// app/api/warehouse/batches/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { WarehouseBatch } from "@/lib/models/WarehouseBatch";
import { Warehouse } from "@/lib/models/Warehouse";
import { getTokenPayload } from "@/lib/auth/jwt";

// GET: Get all warehouse batches with search and filters
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(request);

    if (!payload || !["admin", "pharmacist"].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const warehouseId = searchParams.get("warehouseId") || "";
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "100");

    let query: any = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { batchNumber: searchRegex },
        { lotNumber: searchRegex },
        { supplier: searchRegex },
      ];
    }

    if (warehouseId) {
      query.warehouse = warehouseId;
    }

    if (status) {
      query.status = status;
    }

    const batches = await WarehouseBatch.find(query)
      .populate("warehouse", "name genericName category manufacturer")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: batches,
      count: batches.length,
    });
  } catch (error: any) {
    console.error("Error fetching warehouse batches:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch warehouse batches",
      },
      { status: 500 },
    );
  }
}

// POST: Create new warehouse batch
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(request);

    if (!payload || !["admin", "pharmacist"].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      warehouse,
      batchNumber,
      lotNumber,
      form,
      dosage,
      frequency,
      route,
      expiryDate,
      quantity,
      unitCost,
      supplier,
      location,
      notes,
    } = body;

    // Validation
    if (
      !warehouse ||
      !batchNumber ||
      !lotNumber ||
      !form ||
      !dosage ||
      !frequency ||
      !route ||
      !expiryDate ||
      !quantity ||
      !unitCost ||
      !supplier
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    // Check if warehouse exists
    const warehouseDoc = await Warehouse.findById(warehouse);
    if (!warehouseDoc) {
      return NextResponse.json(
        { success: false, error: "Warehouse medicine not found" },
        { status: 404 },
      );
    }

    // Check if batch number already exists
    const existingBatch = await WarehouseBatch.findOne({
      batchNumber: batchNumber.trim(),
    });
    if (existingBatch) {
      return NextResponse.json(
        { success: false, error: "Batch number already exists" },
        { status: 409 },
      );
    }

    const batch = new WarehouseBatch({
      warehouse,
      batchNumber: batchNumber.trim(),
      lotNumber: lotNumber.trim(),
      form,
      dosage,
      frequency,
      route,
      expiryDate: new Date(expiryDate),
      quantity: parseInt(quantity),
      originalQuantity: parseInt(quantity),
      unitCost: parseFloat(unitCost),
      supplier: supplier.trim(),
      location: location?.trim(),
      notes: notes?.trim(),
    });

    await batch.save();

    return NextResponse.json(
      {
        success: true,
        data: batch,
        message: "Warehouse batch created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating warehouse batch:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create warehouse batch",
      },
      { status: 500 },
    );
  }
}
