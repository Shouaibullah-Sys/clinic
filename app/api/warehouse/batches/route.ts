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
    const search = searchParams.get("search") || "";
    const warehouseId = searchParams.get("warehouseId") || "";
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "100");

    let where: any = {};

    if (search) {
      where.OR = [
        { batchNumber: { contains: search } },
        { lotNumber: { contains: search } },
        { supplier: { contains: search } },
      ];
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (status) {
      where.status = status;
    }

    const batches = await prisma.warehouseBatch.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true, genericName: true, category: true, manufacturer: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

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
    const {
      warehouse,
      batchNumber,
      lotNumber,
      form,
      dosage,
      expiryDate,
      quantity,
      unitCost,
      supplier,
      location,
      notes,
    } = body;

    if (
      !warehouse ||
      !batchNumber ||
      !lotNumber ||
      !form ||
      !dosage ||
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

    const warehouseDoc = await prisma.warehouse.findUnique({
      where: { id: warehouse },
    });
    if (!warehouseDoc) {
      return NextResponse.json(
        { success: false, error: "Warehouse medicine not found" },
        { status: 404 },
      );
    }

    const existingBatch = await prisma.warehouseBatch.findFirst({
      where: { batchNumber: batchNumber.trim() },
    });
    if (existingBatch) {
      return NextResponse.json(
        { success: false, error: "Batch number already exists" },
        { status: 409 },
      );
    }

    const batch = await prisma.warehouseBatch.create({
      data: {
        batchId: `WB${Date.now()}`,
        warehouseId: warehouse,
        batchNumber: batchNumber.trim(),
        lotNumber: lotNumber.trim(),
        form,
        dosage,
        expiryDate: new Date(expiryDate),
        quantity: parseInt(quantity),
        originalQuantity: parseInt(quantity),
        unitCost: parseFloat(unitCost),
        supplier: supplier.trim(),
        location: location?.trim(),
        notes: notes?.trim(),
      },
    });

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