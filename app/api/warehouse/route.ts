// app/api/warehouse/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Warehouse } from "@/lib/models/Warehouse";
import { getTokenPayload } from "@/lib/auth/jwt";

// GET: Get all warehouse medicines with search and filters
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
    const category = searchParams.get("category") || "";
    const manufacturer = searchParams.get("manufacturer") || "";
    const status = searchParams.get("status") || "";
    const limit = parseInt(searchParams.get("limit") || "100");

    let query: any = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { name: searchRegex },
        { genericName: searchRegex },
        { manufacturer: searchRegex },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (manufacturer) {
      query.manufacturer = manufacturer;
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const medicines = await Warehouse.find(query)
      .sort({ name: 1 })
      .limit(limit)
      .lean();

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

// POST: Create new warehouse medicine
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
    const { name, genericName, category, manufacturer, description } = body;

    // Validation
    if (!name || !category || !manufacturer) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, category, manufacturer",
        },
        { status: 400 },
      );
    }

    // Check if medicine with same name already exists
    const existingMedicine = await Warehouse.findOne({ name: name.trim() });
    if (existingMedicine) {
      return NextResponse.json(
        { success: false, error: "Medicine with this name already exists" },
        { status: 409 },
      );
    }

    // Generate warehouseId if not provided
    let warehouseId = body.warehouseId;
    if (!warehouseId) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const random = Math.floor(1000 + Math.random() * 9000);
      warehouseId = `WH${year}${month}${random}`;
    }

    const medicine = new Warehouse({
      warehouseId,
      name: name.trim(),
      genericName: genericName?.trim(),
      category,
      manufacturer: manufacturer.trim(),
      description: description?.trim(),
      isActive: true,
    });

    await medicine.save();

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
