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
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "50");

    const transfers = await prisma.warehouseTransfer.findMany({
      where: status ? { status } : undefined,
      include: {
        transferredBy: { select: { name: true, email: true } },
        receivedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

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

export async function POST(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);

    if (!payload || !["admin", "pharmacy_head"].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { items, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Transfer must have at least one item" },
        { status: 400 },
      );
    }

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

      const batch = await prisma.warehouseBatch.findUnique({
        where: { id: warehouseBatchId },
        include: { warehouse: true },
      });
      if (!batch) {
        return NextResponse.json(
          {
            success: false,
            error: `Warehouse batch not found: ${warehouseBatchId}`,
          },
          { status: 404 },
        );
      }

      if (batch.quantity < quantity) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient quantity for batch ${batch.batchNumber}. Available: ${batch.quantity}, Requested: ${quantity}`,
          },
          { status: 400 },
        );
      }

      if (batch.status === "expired") {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot transfer expired batch: ${batch.batchNumber}`,
          },
          { status: 400 },
        );
      }

      const totalCost = batch.unitCost ? batch.unitCost * quantity : 0;

      transferItems.push({
        warehouseBatchId: batch.id,
        quantity,
        unitCost: batch.unitCost,
        totalCost,
      });

      const normalizedBatchNumber =
        (typeof batch.batchNumber === "string" && batch.batchNumber.trim()) ||
        (typeof batch.lotNumber === "string" && batch.lotNumber.trim()) ||
        `WB-${batch.id}`;

      pharmacyStockUpdates.push({
        name: batch.warehouse?.name,
        form: batch.form,
        dosage: batch.dosage,
        batchNumber: normalizedBatchNumber,
        expiryDate: batch.expiryDate,
        currentQuantity: quantity,
        originalQuantity: quantity,
        unitPrice: batch.unitCost,
        sellingPrice: batch.unitCost ? batch.unitCost * 1.2 : 0,
        supplier: batch.supplier,
        warehouseBatchId: batch.id,
      });
    }

    const transfer = await prisma.warehouseTransfer.create({
      data: {
        transferId: `TRF${Date.now()}`,
        items: JSON.stringify(transferItems),
        transferredById: payload.id,
        notes: notes?.trim(),
        status: "completed",
      },
    });

    for (const item of transferItems) {
      await prisma.warehouseBatch.update({
        where: { id: item.warehouseBatchId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    for (const stockData of pharmacyStockUpdates) {
      const existingStock = await prisma.medicineStock.findFirst({
        where: { warehouseBatchId: stockData.warehouseBatchId },
      });

      if (existingStock) {
        await prisma.medicineStock.update({
          where: { id: existingStock.id },
          data: {
            inwardQty: { increment: stockData.currentQuantity },
          },
        });
      } else {
        await prisma.medicineStock.create({
          data: {
            medicineId: stockData.name || "",
            batchNo: stockData.batchNumber || "",
            warehouseBatchId: stockData.warehouseBatchId,
            expiryDate: stockData.expiryDate,
            inwardQty: stockData.currentQuantity,
            outwardQty: 0,
            returnQty: 0,
            damageQty: 0,
            costPrice: stockData.unitPrice,
            sellPrice: stockData.sellingPrice,
            MRP: stockData.sellingPrice,
            totalQty: stockData.currentQuantity,
          },
        });
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