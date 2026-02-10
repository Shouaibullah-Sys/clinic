//app/api/pharmacy/prescriptions/[id]/dispense/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Prescription } from "@/lib/models/Prescription";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { MedicineIssue } from "@/lib/models/MedicineIssue";
import { getTokenPayload } from "@/lib/auth/jwt";
import mongoose from "mongoose";

// Type for populated patient
interface PopulatedPatient {
  _id: string;
  name: string;
  patientId: string;
}

// Type for populated doctor
interface PopulatedDoctor {
  _id: string;
  name: string;
}

// Type for populated prescription
interface PopulatedPrescription {
  _id: any;
  prescriptionId: string;
  patient: PopulatedPatient | null;
  doctor: PopulatedDoctor | null;
  medications: any[];
  status: string;
  dispensingStatus: string;
  dispensedBy?: any;
  dispensedDate?: Date;
  pharmacyNotes?: string;
  instructions?: string;
  paymentVerified: boolean;
  paymentStatus: string;
  charges: any;
  prescribedDate: Date;
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(req);

    if (
      !payload ||
      !(payload.role === "pharmacist" || payload.role === "admin")
    ) {
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
      patientInstructions,
    } = body;

    // Validate required fields
    if (!dispensedBy) {
      return NextResponse.json(
        { error: "dispensedBy is required" },
        { status: 400 },
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items is required and must be a non-empty array" },
        { status: 400 },
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.medicine) {
        return NextResponse.json(
          { error: "medicine is required for each item" },
          { status: 400 },
        );
      }
      if (!item.dispensedQuantity || item.dispensedQuantity <= 0) {
        return NextResponse.json(
          { error: "dispensedQuantity is required and must be greater than 0" },
          { status: 400 },
        );
      }
      if (!item.unitPrice || item.unitPrice < 0) {
        return NextResponse.json(
          { error: "unitPrice is required and must be non-negative" },
          { status: 400 },
        );
      }
    }

    // Validate totalAmount
    if (totalAmount === undefined || totalAmount === null || totalAmount < 0) {
      return NextResponse.json(
        { error: "totalAmount is required and must be non-negative" },
        { status: 400 },
      );
    }

    // Validate paymentMethod
    const validPaymentMethods = ["cash", "card", "insurance", "other"];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        {
          error: `paymentMethod must be one of: ${validPaymentMethods.join(", ")}`,
        },
        { status: 400 },
      );
    }

    console.log("🔄 Dispensing prescription:", prescriptionId);
    console.log("Items to dispense:", items);

    // Verify totalAmount matches calculated total from items
    const calculatedTotal = items.reduce(
      (sum: number, item: any) => sum + item.dispensedQuantity * item.unitPrice,
      0,
    );
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return NextResponse.json(
        {
          error: `totalAmount (${totalAmount}) does not match calculated total (${calculatedTotal})`,
          calculatedTotal,
          providedTotal: totalAmount,
        },
        { status: 400 },
      );
    }

    // Find prescription with patient populated
    const prescription = (await Prescription.findById(prescriptionId)
      .populate("patient", "name patientId") // Populate patient
      .populate("doctor", "name")) as PopulatedPrescription | null;

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    // Check if prescription has been paid/verified
    if (!prescription.paymentVerified) {
      return NextResponse.json(
        {
          error:
            "Payment not verified. Please ask reception to verify payment before dispensing.",
          paymentStatus: prescription.paymentStatus,
          requiresPaymentVerification: true,
        },
        { status: 403 },
      );
    }

    // Get patient name from prescription
    const patientName = prescription.patient?.name || "Unknown Patient";
    console.log("Patient name:", patientName);

    // Check if already dispensed
    if (prescription.dispensingStatus === "full") {
      return NextResponse.json(
        { error: "Prescription already dispensed" },
        { status: 400 },
      );
    }

    // Process each medicine
    const processedItems = [];

    for (const item of items) {
      // Find medicine in stock
      const medicine = await MedicineStock.findById(item.medicine);
      if (!medicine) {
        return NextResponse.json(
          {
            error: `Medicine not found: ${item.medicine}`,
          },
          { status: 404 },
        );
      }

      // Validate stock
      if (medicine.currentQuantity < item.dispensedQuantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${medicine.name}. Available: ${medicine.currentQuantity}, Requested: ${item.dispensedQuantity}`,
          },
          { status: 400 },
        );
      }

      // Update stock quantity
      const oldQuantity = medicine.currentQuantity;
      medicine.currentQuantity -= item.dispensedQuantity;
      await medicine.save();

      console.log(
        `📉 Updated ${medicine.name} stock: ${oldQuantity} → ${medicine.currentQuantity}`,
      );

      // Create medicine issue record with all required fields
      const medicineIssue = new MedicineIssue({
        medicineId: medicine._id,
        quantity: item.dispensedQuantity,
        issueDate: new Date(),
        issuedTo: patientName, // Use patient name from prescription
        issuedBy:
          typeof dispensedBy === "string"
            ? dispensedBy
            : dispensedBy.toString(), // Convert to string
        prescriptionId: prescription.prescriptionId,
      });

      await medicineIssue.save();
      console.log(`📝 Created MedicineIssue record for ${medicine.name}`);

      processedItems.push({
        medicine: medicine.name,
        quantity: item.dispensedQuantity,
        form: medicine.form || "N/A",
        dosage: medicine.dosage || "N/A",
        frequency: medicine.frequency || "N/A",
        route: medicine.route || "N/A",
        unitPrice: item.unitPrice,
        total: item.dispensedQuantity * item.unitPrice,
      });
    }

    // Update prescription status
    const totalDispensed = items.reduce(
      (sum: number, item: any) => sum + item.dispensedQuantity,
      0,
    );
    const totalPrescribed = prescription.medications.reduce(
      (sum: number, med: any) => {
        // Check if medicine exists before accessing
        return sum + (med.quantity || 0);
      },
      0,
    );

    // Convert dispensedBy to ObjectId for the prescription
    prescription.dispensedBy =
      typeof dispensedBy === "string"
        ? new mongoose.Types.ObjectId(dispensedBy)
        : dispensedBy;
    prescription.dispensedDate = new Date();
    prescription.pharmacyNotes = pharmacyNotes;
    prescription.instructions =
      patientInstructions || prescription.instructions;

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

    // Cast to IPrescription to access Mongoose document methods
    await (prescription as any).save({ validateBeforeSave: false });

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
          dispensedDate: prescription.dispensedDate,
        },
        processedItems,
        summary: {
          totalAmount,
          totalDispensed,
          paymentMethod,
        },
      },
      message: "Medicines dispensed successfully",
    });
  } catch (error: any) {
    console.error("❌ Error dispensing medicines:", error);

    // More detailed error logging
    if (error.errors) {
      console.error("Validation errors:", error.errors);
    }

    return NextResponse.json(
      {
        error: error.message || "Failed to dispense medicines",
      },
      { status: 500 },
    );
  }
}
