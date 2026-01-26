import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Prescription } from "@/lib/models/Prescription";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const payload = await getTokenPayload(req);

  if (!payload || !(payload.role === "pharmacist" || payload.role === "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: prescriptionId } = await params;
    const body = await req.json();
    const {
      dispensedBy,
      items,
      totalAmount,
      paymentMethod,
      pharmacyNotes,
      patientInstructions,
      dispensingStatus = "full",
    } = body;

    // Find prescription
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 }
      );
    }

    // Check if already dispensed
    if (prescription.dispensingStatus === "full") {
      return NextResponse.json(
        { error: "Prescription already fully dispensed" },
        { status: 400 }
      );
    }

    // Check if expired
    if (prescription.status === "expired") {
      return NextResponse.json(
        { error: "Prescription has expired" },
        { status: 400 }
      );
    }

    // Update medicine stock
    for (const item of items) {
      const medicine = await MedicineStock.findById(item.medicine);
      if (!medicine) {
        return NextResponse.json(
          { error: `Medicine not found: ${item.medicine}` },
          { status: 404 }
        );
      }

      if (medicine.currentQuantity < item.dispensedQuantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${medicine.name}` },
          { status: 400 }
        );
      }

      // Deduct from stock
      medicine.currentQuantity -= item.dispensedQuantity;
      
      // Add to history
      if (!medicine.history) medicine.history = [];
      medicine.history.push({
        type: "issued",
        date: new Date(),
        quantity: item.dispensedQuantity,
        reason: `Dispensed for prescription ${prescription.prescriptionId}`,
        recordedBy: dispensedBy,
      });

      await medicine.save();
    }

    // Update prescription
    prescription.dispensedBy = dispensedBy;
    prescription.dispensedDate = new Date();
    prescription.dispensingStatus = dispensingStatus;
    prescription.pharmacyNotes = pharmacyNotes;
    prescription.instructions = patientInstructions || prescription.instructions;
    
    // Update status based on dispensing
    if (dispensingStatus === "full") {
      prescription.status = "completed";
    } else if (dispensingStatus === "partial") {
      prescription.status = "active"; // Keep active for partial dispensing
    }

    await prescription.save();

    return NextResponse.json({
      success: true,
      data: prescription,
      message: "Medicines dispensed successfully",
    });
  } catch (error) {
    console.error("Error dispensing medicines:", error);
    return NextResponse.json(
      { error: "Failed to dispense medicines" },
      { status: 500 }
    );
  }
}