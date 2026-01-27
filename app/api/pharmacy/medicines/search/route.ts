// app/api/pharmacy/medicines/search/route.ts - NEW
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  await dbConnect();
  const payload = await getTokenPayload(req);

  if (!payload || !(payload.role === "admin" || payload.role === "pharmacist" || payload.role === "doctor")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const includeLowStock = searchParams.get("includeLowStock") === "true";

    if (!search) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    // Build search query with fuzzy matching
    const searchRegex = new RegExp(search, "i");
    let query: any = {
      $or: [
        { name: searchRegex },
        { batchNumber: searchRegex },
        { supplier: searchRegex },
      ]
    };

    // Add fuzzy search for common misspellings
    const fuzzySearch = search.toLowerCase();
    const commonMisspellings = {
      'paracetamol': ['paracetamol', 'paracetamol', 'paracetamol', 'paracetamol'],
      'amoxicillin': ['amoxicillin', 'amoxillin', 'amoxycillin', 'amoxacillin'],
      'ibuprofen': ['ibuprofen', 'ibuprophen', 'ibuprophen', 'ibuprofen'],
      'aspirin': ['aspirin', 'asprin', 'asprine', 'aspirine'],
      'omeprazole': ['omeprazole', 'omeprozole', 'omeprazol', 'omeprozol'],
      'cetirizine': ['cetirizine', 'cetrizine', 'cetirizine', 'cetrizine'],
      'metformin': ['metformin', 'metformine', 'metformin', 'metformine'],
      'losartan': ['losartan', 'losartan', 'losartan', 'losartan'],
      'atorvastatin': ['atorvastatin', 'atorvastatin', 'atorvastatin', 'atorvastatin'],
      'salbutamol': ['salbutamol', 'salbutamol', 'salbutamol', 'salbutamol']
    };

    // Check for common misspellings and add to search
    let fuzzyRegex = searchRegex;
    for (const [correct, variations] of Object.entries(commonMisspellings)) {
      if (variations.includes(fuzzySearch)) {
        fuzzyRegex = new RegExp(correct, "i");
        break;
      }
    }

    // Add fuzzy search to query
    query.$or.push({ name: fuzzyRegex });

    // Filter out expired medicines
    const today = new Date();
    query.expiryDate = { $gt: today };

    // Optionally include low stock items
    if (!includeLowStock) {
      query.currentQuantity = { $gt: 0 };
    }

    // Search medicines with pagination
    const medicines = await MedicineStock.find(query)
      .select("name batchNumber supplier currentQuantity originalQuantity unitPrice sellingPrice expiryDate")
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    // Calculate additional fields
    const enhancedMedicines = medicines.map(medicine => {
      const remainingPercentage = (medicine.currentQuantity / medicine.originalQuantity) * 100;
      const isLowStock = medicine.currentQuantity <= 10; // Threshold for low stock
      const isExpiringSoon = new Date(medicine.expiryDate).getTime() - today.getTime() <= 30 * 24 * 60 * 60 * 1000;

      return {
        ...medicine,
        remainingPercentage: Math.round(remainingPercentage),
        isLowStock,
        isExpiringSoon,
        status: isLowStock ? "low-stock" : (isExpiringSoon ? "expiring-soon" : "available")
      };
    });

    return NextResponse.json({
      success: true,
      data: enhancedMedicines,
      total: medicines.length
    });

  } catch (error) {
    console.error("Error searching medicines:", error);
    return NextResponse.json(
      { error: "Failed to search medicines" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}