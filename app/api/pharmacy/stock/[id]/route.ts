// app/api/pharmacy/stock/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { MedicineStock } from "@/lib/models/MedicineStock";
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    
    const userRole = payload.role as string;
    
    // Authorization
    if (!["admin", "pharmacist", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access medicine stock." },
        { status: 403 }
      );
    }
    
    // UNWRAP THE PARAMS PROMISE
    const { id: medicineId } = await params;
    
    const medicine = await MedicineStock.findById(medicineId).lean();
    
    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "Medicine not found" },
        { status: 404 }
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
      { status: 500 }
    );
  }
}

// PUT: Update medicine stock
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    
    const userId = payload.id as string;
    const userRole = payload.role as string;
    
    // Authorization
    if (!["admin", "pharmacist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to update medicine stock." },
        { status: 403 }
      );
    }
    
    // UNWRAP THE PARAMS PROMISE
    const { id: medicineId } = await params;
    
    const body = await request.json();
    const {
      name,
      batchNumber,
      expiryDate,
      originalQuantity,
      currentQuantity,
      unitPrice,
      sellingPrice,
      supplier,
      description,
    } = body;
    
    // Check if medicine exists
    const medicine = await MedicineStock.findById(medicineId);
    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "Medicine not found" },
        { status: 404 }
      );
    }
    
    // Check for duplicate batch number (excluding current medicine)
    if (batchNumber && batchNumber !== medicine.batchNumber) {
      const existingBatch = await MedicineStock.findOne({
        batchNumber,
        _id: { $ne: medicineId },
      });
      
      if (existingBatch) {
        return NextResponse.json(
          { success: false, error: "Batch number already exists" },
          { status: 409 }
        );
      }
    }
    
    // Update fields
    if (name) medicine.name = name.trim();
    if (batchNumber) medicine.batchNumber = batchNumber.trim();
    if (expiryDate) medicine.expiryDate = new Date(expiryDate);
    if (originalQuantity) medicine.originalQuantity = parseInt(originalQuantity);
    if (currentQuantity !== undefined) medicine.currentQuantity = parseInt(currentQuantity);
    if (unitPrice) medicine.unitPrice = parseFloat(unitPrice);
    if (sellingPrice) medicine.sellingPrice = parseFloat(sellingPrice);
    if (supplier) medicine.supplier = supplier.trim();
    if (description !== undefined) medicine.description = description?.trim();
    
    await medicine.save();
    
    return NextResponse.json({
      success: true,
      data: medicine,
      message: "Medicine updated successfully"
    });
    
  } catch (error: any) {
    console.error("Error updating medicine:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update medicine" },
      { status: 500 }
    );
  }
}

// DELETE: Delete medicine stock
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    
    const userRole = payload.role as string;
    
    // Authorization
    if (!["admin", "pharmacist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to delete medicine stock." },
        { status: 403 }
      );
    }
    
    // UNWRAP THE PARAMS PROMISE
    const { id: medicineId } = await params;
    
    const medicine = await MedicineStock.findById(medicineId);
    
    if (!medicine) {
      return NextResponse.json(
        { success: false, error: "Medicine not found" },
        { status: 404 }
      );
    }
    
    await medicine.deleteOne();
    
    return NextResponse.json({
      success: true,
      message: "Medicine deleted successfully"
    });
    
  } catch (error: any) {
    console.error("Error deleting medicine:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete medicine" },
      { status: 500 }
    );
  }
}