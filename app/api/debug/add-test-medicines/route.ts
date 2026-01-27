// app/api/debug/add-test-medicines/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  await dbConnect();
  const payload = await getTokenPayload(req);

  if (!payload || !(payload.role === "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Clear existing test medicines
    await MedicineStock.deleteMany({ 
      name: { $in: ['Aspirin', 'Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Omeprazole'] } 
    });

    // Create test medicines
    const testMedicines = [
      {
        name: 'Aspirin',
        batchNumber: 'ASP-2024-001',
        originalQuantity: 100,
        currentQuantity: 100,
        unitPrice: 25,
        sellingPrice: 50,
        expiryDate: new Date('2026-12-31'),
        supplier: 'PharmaCorp',
        description: 'Acetylsalicylic acid for pain relief'
      },
      {
        name: 'Paracetamol',
        batchNumber: 'PAR-2024-002',
        originalQuantity: 200,
        currentQuantity: 200,
        unitPrice: 15,
        sellingPrice: 30,
        expiryDate: new Date('2027-06-30'),
        supplier: 'MediSupply',
        description: 'Acetaminophen for fever and pain'
      },
      {
        name: 'Ibuprofen',
        batchNumber: 'IBU-2024-003',
        originalQuantity: 150,
        currentQuantity: 150,
        unitPrice: 20,
        sellingPrice: 40,
        expiryDate: new Date('2026-09-30'),
        supplier: 'HealthCorp',
        description: 'NSAID for inflammation and pain'
      },
      {
        name: 'Amoxicillin',
        batchNumber: 'AMOX-2024-004',
        originalQuantity: 80,
        currentQuantity: 80,
        unitPrice: 50,
        sellingPrice: 100,
        expiryDate: new Date('2026-03-31'),
        supplier: 'BioPharma',
        description: 'Antibiotic for bacterial infections'
      },
      {
        name: 'Omeprazole',
        batchNumber: 'OME-2024-005',
        originalQuantity: 120,
        currentQuantity: 120,
        unitPrice: 30,
        sellingPrice: 60,
        expiryDate: new Date('2027-01-31'),
        supplier: 'GastroMed',
        description: 'Proton pump inhibitor for acid reflux'
      }
    ];

    // Insert medicines
    const result = await MedicineStock.insertMany(testMedicines);

    return NextResponse.json({
      success: true,
      message: `Successfully added ${result.length} test medicines`,
      medicines: result.map(m => ({
        name: m.name,
        batchNumber: m.batchNumber,
        stock: m.currentQuantity,
        price: m.sellingPrice
      }))
    });

  } catch (error: any) {
    console.error("Error adding test medicines:", error);
    return NextResponse.json(
      { error: "Failed to add test medicines" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to add test medicines. Requires admin role.",
    medicines: [
      "Aspirin",
      "Paracetamol", 
      "Ibuprofen",
      "Amoxicillin",
      "Omeprazole"
    ]
  });
}