import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(req);

    if (!payload || !(payload.role === "admin" || payload.role === "pharmacist" || payload.role === "doctor")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    if (!search.trim()) {
      // Return all active medicines if no search query
      const medicines = await MedicineStock.find({
        currentQuantity: { $gt: 0 },
        expiryDate: { $gt: new Date() }
      })
        .select("name batchNumber currentQuantity originalQuantity unitPrice sellingPrice expiryDate supplier")
        .sort({ name: 1 })
        .limit(limit)
        .lean();

      return NextResponse.json({
        success: true,
        data: medicines.map(m => enhanceMedicineData(m)),
        total: medicines.length
      });
    }

    // Build search query
    const searchRegex = new RegExp(search, "i");
    const query = {
      $or: [
        { name: searchRegex },
        { batchNumber: searchRegex },
        { supplier: searchRegex },
      ],
      currentQuantity: { $gt: 0 },
      expiryDate: { $gt: new Date() }
    };

    // Search medicines
    const medicines = await MedicineStock.find(query)
      .select("name batchNumber currentQuantity originalQuantity unitPrice sellingPrice expiryDate supplier")
      .sort({ name: 1, currentQuantity: -1 })
      .limit(limit)
      .lean();

    // Enhance medicine data
    const enhancedMedicines = medicines.map(medicine => enhanceMedicineData(medicine));

    return NextResponse.json({
      success: true,
      data: enhancedMedicines,
      total: medicines.length
    });

  } catch (error: any) {
    console.error("Error searching medicines:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to search medicines",
      data: []
    }, { status: 500 });
  }
}

// Helper function to enhance medicine data
function enhanceMedicineData(medicine: any) {
  const today = new Date();
  const expiryDate = new Date(medicine.expiryDate);
  const remainingPercentage = (medicine.currentQuantity / medicine.originalQuantity) * 100;
  const isLowStock = medicine.currentQuantity <= 20;
  const isExpiringSoon = expiryDate.getTime() - today.getTime() <= 30 * 24 * 60 * 60 * 1000; // 30 days
  
  return {
    ...medicine,
    _id: medicine._id.toString(),
    remainingPercentage: Math.round(remainingPercentage),
    isLowStock,
    isExpiringSoon,
    status: isLowStock ? "low-stock" : (isExpiringSoon ? "expiring-soon" : "available"),
    daysToExpiry: Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  };
}