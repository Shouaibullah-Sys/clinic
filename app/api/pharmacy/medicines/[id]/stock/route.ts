// app/api/pharmacy/medicines/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const payload = await getTokenPayload(req);
    if (
      !payload ||
      !(
        payload.role === "pharmacist" ||
        payload.role === "admin" ||
        payload.role === "doctor"
      )
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if it's an ObjectId or a medicine name
    let medicine;

    if (mongoose.Types.ObjectId.isValid(id)) {
      // Search by ID
      medicine = await MedicineStock.findById(id).select(
        "name form dosage frequency route currentQuantity originalQuantity unitPrice sellingPrice expiryDate supplier description",
      );
    } else {
      // Search by name (fallback)
      medicine = await MedicineStock.findOne({
        name: { $regex: new RegExp(`^${id}$`, "i") },
      }).select(
        "name form dosage frequency route currentQuantity originalQuantity unitPrice sellingPrice expiryDate supplier description",
      );
    }

    if (!medicine) {
      return NextResponse.json(
        { error: "Medicine not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: medicine._id,
        name: medicine.name,
        form: medicine.form,
        dosage: medicine.dosage,
        frequency: medicine.frequency,
        route: medicine.route,
        currentQuantity: medicine.currentQuantity,
        originalQuantity: medicine.originalQuantity,
        unitPrice: medicine.unitPrice,
        sellingPrice: medicine.sellingPrice,
        expiryDate: medicine.expiryDate,
        supplier: medicine.supplier,
        description: medicine.description,
        remainingPercentage: Math.round(
          (medicine.currentQuantity / medicine.originalQuantity) * 100,
        ),
        isLowStock: medicine.currentQuantity <= 10,
        isExpiringSoon:
          new Date(medicine.expiryDate).getTime() - Date.now() <=
          30 * 24 * 60 * 60 * 1000,
      },
    });
  } catch (error: any) {
    console.error("Error fetching medicine:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch medicine" },
      { status: 500 },
    );
  }
}
