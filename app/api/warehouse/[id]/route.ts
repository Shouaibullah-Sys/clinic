// app/api/warehouse/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(request);

    if (!payload || !["admin", "pharmacy_head"].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const medicine = await prisma.warehouse.findUnique({
      where: { id },
    });

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
    const medicine = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "Warehouse medicine not found" },
        { status: 404 },
      );
    }

    const updatedMedicine = await prisma.warehouse.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        genericName: genericName !== undefined ? genericName?.trim() : undefined,
        category: category !== undefined ? category : undefined,
        manufacturer: manufacturer !== undefined ? manufacturer.trim() : undefined,
        description: description !== undefined ? description?.trim() : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedMedicine,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
    const medicine = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "Warehouse medicine not found" },
        { status: 404 },
      );
    }

    const batchCount = await prisma.medicineStock.count({
      where: { medicineId: id },
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

    await prisma.warehouse.delete({
      where: { id },
    });

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
