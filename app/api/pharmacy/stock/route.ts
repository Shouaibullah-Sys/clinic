// app/api/pharmacy/stock/route.ts
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

// GET: Get medicine stock with search
export async function GET(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "100");
    
    let query: any = {};
    
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { name: searchRegex },
        { batchNumber: searchRegex },
        { supplier: searchRegex },
      ];
    }
    
    const medicines = await MedicineStock.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    return NextResponse.json({
      success: true,
      data: medicines,
    });
    
  } catch (error: any) {
    console.error("Error fetching medicine stock:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch medicine stock" },
      { status: 500 }
    );
  }
}

// POST: Add new medicine stock
export async function POST(request: NextRequest) {
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
        { success: false, error: "Forbidden. You don't have permission to add medicine stock." },
        { status: 403 }
      );
    }
    
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
    
    // Validation
    if (!name || !batchNumber || !expiryDate || !originalQuantity || !unitPrice || !sellingPrice || !supplier) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Check for duplicate batch number
    const existingBatch = await MedicineStock.findOne({ batchNumber });
    if (existingBatch) {
      return NextResponse.json(
        { success: false, error: "Batch number already exists" },
        { status: 409 }
      );
    }
    
    // Create medicine stock
    const medicineStock = new MedicineStock({
      name: name.trim(),
      batchNumber: batchNumber.trim(),
      expiryDate: new Date(expiryDate),
      originalQuantity: parseInt(originalQuantity),
      currentQuantity: currentQuantity ? parseInt(currentQuantity) : parseInt(originalQuantity),
      unitPrice: parseFloat(unitPrice),
      sellingPrice: parseFloat(sellingPrice),
      supplier: supplier.trim(),
      description: description?.trim(),
    });
    
    await medicineStock.save();
    
    return NextResponse.json({
      success: true,
      data: medicineStock,
      message: "Medicine added successfully"
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error adding medicine stock:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add medicine stock" },
      { status: 500 }
    );
  }
}