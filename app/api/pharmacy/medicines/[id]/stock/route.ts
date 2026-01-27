import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  
  const payload = await getTokenPayload(req);
  if (!payload || !(payload.role === "pharmacist" || payload.role === "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: medicineId } = await params;
    const medicine = await MedicineStock.findById(medicineId)
      .select("name batchNumber currentQuantity minimumStock sellingPrice unitPrice");
    
    if (!medicine) {
      return NextResponse.json(
        { error: "Medicine not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...medicine.toObject(),
        isLowStock: medicine.currentQuantity < medicine.minimumStock
      }
    });
  } catch (error) {
    console.error("Error fetching medicine stock:", error);
    return NextResponse.json(
      { error: "Failed to fetch medicine stock" },
      { status: 500 }
    );
  }
}