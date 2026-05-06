// app/api/pharmacy/stock/[id]/route.ts

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

// GET: Get single medicine stock
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication
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

    // Authorization
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

    // UNWRAP THE PARAMS PROMISE
    const { id: medicineId } = await params;

    const medicine = await prisma.medicineStock.findUnique({
      where: { id: medicineId },
    });

    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "Medicine not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: medicine,
    });
  } catch (error: any) {
    console.error("Error fetching medicine:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch medicine" },
      { status: 500 },
    );
  }
}

// PUT: Update medicine stock
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication
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

    // Authorization
    if (!["admin", "pharmacist", "pharmacy_head"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to update medicine stock.",
        },
        { status: 403 },
      );
    }

    // UNWRAP THE PARAMS PROMISE
    const { id: medicineId } = await params;

    const body = await request.json();
    const {
      name,
      expiryDate,
      originalQuantity,
      currentQuantity,
      unitPrice,
      sellingPrice,
      supplier,
      description,
      form,
      dosage,
      frequency,
      route,
    } = body;

    // Check if medicine exists
    const existingMedicine = await prisma.medicineStock.findUnique({
      where: { id: medicineId },
    });
    if (!existingMedicine) {
      return NextResponse.json(
        { success: false, error: "Medicine not found" },
        { status: 404 },
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (expiryDate) updateData.expiryDate = new Date(expiryDate);
    if (originalQuantity) updateData.originalQuantity = parseInt(originalQuantity);
    if (currentQuantity !== undefined) updateData.currentQuantity = parseInt(currentQuantity);
    if (unitPrice) updateData.costPrice = parseFloat(unitPrice);
    if (sellingPrice) updateData.sellPrice = parseFloat(sellingPrice);
    if (supplier) updateData.supplier = supplier.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (form !== undefined) updateData.form = form?.trim();
    if (dosage !== undefined) updateData.dosage = dosage?.trim();
    if (frequency !== undefined) updateData.frequency = frequency?.trim();
    if (route !== undefined) updateData.route = route?.trim();

    const medicine = await prisma.medicineStock.update({
      where: { id: medicineId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: medicine,
      message: "Medicine updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating medicine:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update medicine" },
      { status: 500 },
    );
  }
}

// DELETE: Delete medicine stock
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication
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

    // Authorization
    if (!["admin", "pharmacist", "pharmacy_head"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to delete medicine stock.",
        },
        { status: 403 },
      );
    }

    // UNWRAP THE PARAMS PROMISE
    const { id: medicineId } = await params;

    const medicine = await prisma.medicineStock.findUnique({
      where: { id: medicineId },
    });

    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "Medicine not found" },
        { status: 404 },
      );
    }

    await prisma.medicineStock.delete({
      where: { id: medicineId },
    });

    return NextResponse.json({
      success: true,
      message: "Medicine deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting medicine:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete medicine" },
      { status: 500 },
    );
  }
}
