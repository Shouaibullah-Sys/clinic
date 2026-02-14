// app/api/warehouse/transfers/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { WarehouseTransfer } from "@/lib/models/WarehouseTransfer";
import { WarehouseBatch } from "@/lib/models/WarehouseBatch";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { Warehouse } from "@/lib/models/Warehouse";
import { getTokenPayload } from "@/lib/auth/jwt";

// GET: Get all transfers with filters
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
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "50");

    let query: any = {};

    if (status) {
      query.status = status;
    }

    const transfers = await WarehouseTransfer.find(query)
      .populate("transferredBy", "name email")
      .populate("receivedBy", "name email")
      .populate("items.warehouseBatch")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: transfers,
      count: transfers.length,
    });
  } catch (error: any) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch transfers",
      },
      { status: 500 },
    );
  }
}

// POST: Create new transfer from warehouse to pharmacy
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(request);

    if (!payload || !["admin", "pharmacy_head"].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { items, notes } = body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Transfer must have at least one item" },
        { status: 400 },
      );
    }

    // Validate each item and check availability
    const transferItems = [];
    const pharmacyStockUpdates = [];

    for (const item of items) {
      const { warehouseBatchId, quantity } = item;

      if (!warehouseBatchId || !quantity || quantity <= 0) {
        return NextResponse.json(
          { success: false, error: "Invalid item data" },
          { status: 400 },
        );
      }

      // Get the warehouse batch
      const batch =
        await WarehouseBatch.findById(warehouseBatchId).populate("warehouse");
      if (!batch) {
        return NextResponse.json(
          {
            success: false,
            error: `Warehouse batch not found: ${warehouseBatchId}`,
          },
          { status: 404 },
        );
      }

      // Check if batch has enough quantity
      if (batch.quantity < quantity) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient quantity for batch ${batch.batchNumber}. Available: ${batch.quantity}, Requested: ${quantity}`,
          },
          { status: 400 },
        );
      }

      // Check if batch is expired
      if (batch.status === "expired") {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot transfer expired batch: ${batch.batchNumber}`,
          },
          { status: 400 },
        );
      }

      const totalCost = batch.unitCost * quantity;

      transferItems.push({
        warehouseBatch: batch._id,
        quantity,
        unitCost: batch.unitCost,
        totalCost,
      });

      // Prepare pharmacy stock update
      const normalizedBatchNumber =
        (typeof batch.batchNumber === "string" && batch.batchNumber.trim()) ||
        (typeof batch.lotNumber === "string" && batch.lotNumber.trim()) ||
        `WB-${String(batch._id)}`;

      pharmacyStockUpdates.push({
        name: batch.warehouse.name,
        form: batch.form,
        dosage: batch.dosage,
        batchNumber: normalizedBatchNumber,
        expiryDate: batch.expiryDate,
        currentQuantity: quantity,
        originalQuantity: quantity,
        unitPrice: batch.unitCost,
        sellingPrice: batch.unitCost * 1.2, // 20% markup by default
        supplier: batch.supplier,
        warehouseBatchId: batch._id,
      });
    }

    // Create transfer record
    const transfer = new WarehouseTransfer({
      items: transferItems,
      transferredBy: payload.id,
      notes: notes?.trim(),
      status: "completed",
    });

    await transfer.save();

    // Update warehouse batches (decrease quantity)
    for (const item of transferItems) {
      await WarehouseBatch.findByIdAndUpdate(item.warehouseBatch, {
        $inc: { quantity: -item.quantity },
      });
    }

    // Create or update pharmacy stock
    for (const stockData of pharmacyStockUpdates) {
      // Check if pharmacy stock already exists for this warehouse batch
      const existingStock = await MedicineStock.findOne({
        warehouseBatchId: stockData.warehouseBatchId,
      });

      if (existingStock) {
        // Update existing stock
        await MedicineStock.findByIdAndUpdate(existingStock._id, {
          $inc: {
            currentQuantity: stockData.currentQuantity,
            originalQuantity: stockData.currentQuantity,
          },
        });
      } else {
        // Create new pharmacy stock
        await MedicineStock.create(stockData);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: transfer,
        message:
          "Transfer completed successfully. Medicines added to pharmacy stock.",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating transfer:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create transfer",
      },
      { status: 500 },
    );
  }
}
