// app/api/warehouse/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Warehouse } from "@/lib/models/Warehouse";
import { getTokenPayload } from "@/lib/auth/jwt";

// GET: Get single warehouse medicine by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(request);

    if (!payload || !["admin", "pharmacy_head"].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const medicine = await Warehouse.findById(id).lean();

    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "Warehouse medicine not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: medicine,
    });
  } catch (error: any) {
    console.error("Error fetching warehouse medicine:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch warehouse medicine",
      },
      { status: 500 },
    );
  }
}

// PUT: Update warehouse medicine
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { name, genericName, category, manufacturer, description, isActive } =
      body;

    const { id } = await params;
    const medicine = await Warehouse.findById(id);

    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "Warehouse medicine not found" },
        { status: 404 },
      );
    }

    // Update fields
    if (name !== undefined) medicine.name = name.trim();
    if (genericName !== undefined) medicine.genericName = genericName?.trim();
    if (category !== undefined) medicine.category = category;
    if (manufacturer !== undefined) medicine.manufacturer = manufacturer.trim();
    if (description !== undefined) medicine.description = description?.trim();
    if (isActive !== undefined) medicine.isActive = isActive;

    await medicine.save();

    return NextResponse.json({
      success: true,
      data: medicine,
      message: "Warehouse medicine updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating warehouse medicine:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update warehouse medicine",
      },
      { status: 500 },
    );
  }
}

// DELETE: Delete warehouse medicine
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(request);

    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Only admin can delete warehouse medicines.",
        },
        { status: 401 },
      );
    }

    const { id } = await params;
    const medicine = await Warehouse.findById(id);

    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "Warehouse medicine not found" },
        { status: 404 },
      );
    }

    // Check if there are any batches for this medicine
    const { WarehouseBatch } = await import("@/lib/models/WarehouseBatch");
    const batchCount = await WarehouseBatch.countDocuments({
      warehouse: id,
    });

    if (batchCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete medicine. It has ${batchCount} batch(es) associated with it.`,
        },
        { status: 400 },
      );
    }

    await Warehouse.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Warehouse medicine deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting warehouse medicine:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete warehouse medicine",
      },
      { status: 500 },
    );
  }
}
