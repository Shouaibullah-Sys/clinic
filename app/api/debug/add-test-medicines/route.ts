// app/api/debug/add-test-medicines/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { MedicineStock } from "@/lib/models/MedicineStock";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Check for admin role (simplified for debugging)
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clear existing test medicines (optional)
    await MedicineStock.deleteMany({
      name: {
        $in: [
          "Aspirin",
          "Paracetamol",
          "Ibuprofen",
          "Amoxicillin",
          "Omeprazole",
        ],
      },
    });

    // Create test medicines with proper dates
    const testMedicines = [
      {
        name: "Aspirin",
        form: "Tablet",
        dosage: "500mg",
        frequency: "3 times daily",
        route: "Oral",
        originalQuantity: 100,
        currentQuantity: 100,
        unitPrice: 25,
        sellingPrice: 50,
        expiryDate: new Date("2026-12-31"),
        supplier: "PharmaCorp",
        description: "Acetylsalicylic acid for pain relief",
      },
      {
        name: "Paracetamol",
        form: "Tablet",
        dosage: "500mg",
        frequency: "4 times daily",
        route: "Oral",
        originalQuantity: 200,
        currentQuantity: 200,
        unitPrice: 15,
        sellingPrice: 30,
        expiryDate: new Date("2027-06-30"),
        supplier: "MediSupply",
        description: "Acetaminophen for fever and pain",
      },
      {
        name: "Ibuprofen",
        form: "Capsule",
        dosage: "400mg",
        frequency: "3 times daily",
        route: "Oral",
        originalQuantity: 150,
        currentQuantity: 150,
        unitPrice: 20,
        sellingPrice: 40,
        expiryDate: new Date("2026-09-30"),
        supplier: "HealthCorp",
        description: "NSAID for inflammation and pain",
      },
      {
        name: "Amoxicillin",
        form: "Capsule",
        dosage: "500mg",
        frequency: "3 times daily",
        route: "Oral",
        originalQuantity: 80,
        currentQuantity: 80,
        unitPrice: 50,
        sellingPrice: 100,
        expiryDate: new Date("2026-03-31"),
        supplier: "BioPharma",
        description: "Antibiotic for bacterial infections",
      },
      {
        name: "Omeprazole",
        form: "Capsule",
        dosage: "20mg",
        frequency: "Once daily",
        route: "Oral",
        originalQuantity: 120,
        currentQuantity: 120,
        unitPrice: 30,
        sellingPrice: 60,
        expiryDate: new Date("2027-01-31"),
        supplier: "GastroMed",
        description: "Proton pump inhibitor for acid reflux",
      },
    ];

    // Insert medicines
    const result = await MedicineStock.insertMany(testMedicines);

    return NextResponse.json({
      success: true,
      message: `Successfully added ${result.length} test medicines`,
      medicines: result.map((m) => ({
        id: m._id,
        name: m.name,
        form: m.form,
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route,
        stock: m.currentQuantity,
        price: m.sellingPrice,
        expiryDate: m.expiryDate,
      })),
    });
  } catch (error: any) {
    console.error("Error adding test medicines:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to add test medicines",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    await dbConnect();

    const medicines = await MedicineStock.find({})
      .select(
        "name form dosage frequency route currentQuantity sellingPrice expiryDate",
      )
      .sort({ name: 1 })
      .limit(10);

    return NextResponse.json({
      success: true,
      message:
        medicines.length > 0
          ? `${medicines.length} medicines found in database`
          : "No medicines found in database. Use POST to add test medicines.",
      medicines: medicines.map((m) => ({
        name: m.name,
        form: m.form,
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route,
        stock: m.currentQuantity,
        price: m.sellingPrice,
        expiryDate: m.expiryDate,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching medicines:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch medicines",
      },
      { status: 500 },
    );
  }
}
