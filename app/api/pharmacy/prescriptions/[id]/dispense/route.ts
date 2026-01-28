//app/api/pharmacy/prescriptions/[id]/dispense/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Prescription } from "@/lib/models/Prescription";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { MedicineIssue } from "@/lib/models/MedicineIssue";
import { Patient } from "@/lib/models/Patient"; // Add this import
import { getTokenPayload } from "@/lib/auth/jwt";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(req);

    if (!payload || !(payload.role === "pharmacist" || payload.role === "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: prescriptionId } = await params;
    const body = await req.json();
    const { 
      dispensedBy, 
      items, 
      totalAmount, 
      paymentMethod, 
      pharmacyNotes, 
      patientInstructions 
    } = body;

    console.log("🔄 Dispensing prescription:", prescriptionId);
    console.log("Items to dispense:", items);

    // Find prescription with patient populated
    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name patientId") // Populate patient
      .populate("doctor", "name");
      
    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    // Get patient name from prescription
    const patientName = prescription.patient?.name || "Unknown Patient";
    console.log("Patient name:", patientName);

    // Check if already dispensed
    if (prescription.dispensingStatus === "full") {
      return NextResponse.json({ error: "Prescription already dispensed" }, { status: 400 });
    }

    // Process each medicine
    const processedItems = [];
    
    for (const item of items) {
      // Find medicine in stock
      const medicine = await MedicineStock.findById(item.medicine);
      if (!medicine) {
        return NextResponse.json({ 
          error: `Medicine not found: ${item.medicine}` 
        }, { status: 404 });
      }

      // Validate stock
      if (medicine.currentQuantity < item.dispensedQuantity) {
        return NextResponse.json({ 
          error: `Insufficient stock for ${medicine.name}. Available: ${medicine.currentQuantity}, Requested: ${item.dispensedQuantity}` 
        }, { status: 400 });
      }

      // Update stock quantity
      const oldQuantity = medicine.currentQuantity;
      medicine.currentQuantity -= item.dispensedQuantity;
      await medicine.save();
      
      console.log(`📉 Updated ${medicine.name} stock: ${oldQuantity} → ${medicine.currentQuantity}`);

      // Create medicine issue record with all required fields
      const medicineIssue = new MedicineIssue({
        medicineId: medicine._id,
        quantity: item.dispensedQuantity,
        issueDate: new Date(),
        issuedTo: patientName, // Use patient name from prescription
        issuedBy: dispensedBy, // This is the pharmacist's ID
        prescriptionId: prescription.prescriptionId
      });
      
      await medicineIssue.save();
      console.log(`📝 Created MedicineIssue record for ${medicine.name}`);
      
      processedItems.push({
        medicine: medicine.name,
        quantity: item.dispensedQuantity,
        batchNumber: item.batchNumber,
        unitPrice: item.unitPrice,
        total: item.dispensedQuantity * item.unitPrice
      });
    }

    // Update prescription status
    const totalDispensed = items.reduce((sum: number, item: any) => sum + item.dispensedQuantity, 0);
const totalPrescribed = prescription.medications.reduce((sum: number, med: any) => {
  // Check if medicine exists before accessing
  return sum + (med.quantity || 0);
}, 0);
    
    prescription.dispensedBy = dispensedBy;
    prescription.dispensedDate = new Date();
    prescription.pharmacyNotes = pharmacyNotes;
    prescription.instructions = patientInstructions || prescription.instructions;
    
    // Determine dispensing status
    if (totalDispensed === 0) {
      prescription.dispensingStatus = "pending";
    } else if (totalDispensed < totalPrescribed) {
      prescription.dispensingStatus = "partial";
      prescription.status = "active";
    } else {
      prescription.dispensingStatus = "full";
      prescription.status = "completed";
    }
    
    await prescription.save({ validateBeforeSave: false });

    console.log("✅ Dispensing completed successfully");

    return NextResponse.json({
      success: true,
      data: {
        prescription: {
          _id: prescription._id,
          prescriptionId: prescription.prescriptionId,
          patient: prescription.patient,
          status: prescription.status,
          dispensingStatus: prescription.dispensingStatus,
          dispensedDate: prescription.dispensedDate
        },
        processedItems,
        summary: {
          totalAmount,
          totalDispensed,
          paymentMethod
        }
      },
      message: "Medicines dispensed successfully"
    });
  } catch (error: any) {
    console.error("❌ Error dispensing medicines:", error);
    
    // More detailed error logging
    if (error.errors) {
      console.error("Validation errors:", error.errors);
    }
    
    return NextResponse.json({ 
      error: error.message || "Failed to dispense medicines" 
    }, { status: 500 });
  }
}