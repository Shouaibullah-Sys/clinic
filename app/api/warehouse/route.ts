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
    const category = searchParams.get("category") || "";
    const manufacturer = searchParams.get("manufacturer") || "";
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "100");

    let where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { genericName: { contains: search } },
        { manufacturer: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (manufacturer) {
      where.manufacturer = manufacturer;
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const medicines = await prisma.warehouse.findMany({
      where,
      orderBy: { name: "asc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: medicines,
      count: medicines.length,
    });
  } catch (error: any) {
    console.error("Error fetching warehouse medicines:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch warehouse medicines",
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
    const { name, genericName, category, manufacturer, description } = body;

    if (!name || !category || !manufacturer) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, category, manufacturer",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.warehouse.findFirst({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Medicine with this name already exists" },
        { status: 409 },
      );
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const warehouseId = `WH${year}${month}${random}`;

    const medicine = await prisma.warehouse.create({
      data: {
        warehouseId,
        name: name.trim(),
        genericName: genericName?.trim(),
        category,
        manufacturer: manufacturer.trim(),
        description: description?.trim(),
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: medicine,
        message: "Warehouse medicine created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating warehouse medicine:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create warehouse medicine",
      },
      { status: 500 },
    );
  }
}