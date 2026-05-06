import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const userRole = payload.role as string;

    if (!["admin", "pharmacist", "pharmacy_head", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to access medicine stock.",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "100");

    let where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { supplier: { contains: search } },
      ];
    }

    const medicines = await prisma.medicineStock.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: medicines,
    });
  } catch (error: any) {
    console.error("Error fetching medicine stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch medicine stock",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const userId = payload.id as string;
    const userRole = payload.role as string;

    if (!["admin", "pharmacist", "pharmacy_head"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to add medicine stock.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      medicineId,
      batchNo,
      expiryDate,
      inwardQty,
      unitPrice,
      sellPrice,
      supplier,
      form,
      dosage,
      frequency,
      route,
    } = body;

    if (
      !medicineId ||
      !batchNo ||
      !expiryDate ||
      !inwardQty ||
      !unitPrice
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const medicineStock = await prisma.medicineStock.create({
      data: {
        medicineId,
        batchNo,
        expiryDate: new Date(expiryDate),
        inwardQty: parseInt(inwardQty),
        outwardQty: 0,
        costPrice: unitPrice ? parseFloat(unitPrice) : null,
        sellPrice: sellPrice ? parseFloat(sellPrice) : null,
        totalQty: parseInt(inwardQty),
        currentQty: parseInt(inwardQty),
        supplier: supplier || null,
        form: form || null,
        dosage: dosage || null,
        frequency: frequency || null,
        route: route || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: medicineStock,
        message: "Medicine added successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error adding medicine stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to add medicine stock",
      },
      { status: 500 },
    );
  }
}