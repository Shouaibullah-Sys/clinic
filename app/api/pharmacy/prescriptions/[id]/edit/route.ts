// app/api/pharmacy/prescriptions/[id]/edit/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import "@/lib/models"; // Import all models to ensure they are registered
import { Prescription } from "@/lib/models/Prescription";
import { getTokenPayload } from "@/lib/auth/jwt";
import mongoose from "mongoose";

// Type definitions
interface MedicationUpdate {
  index: number;
  price?: number;
}

interface UpdateBody {
  medications?: MedicationUpdate[];
  finalize?: boolean;
}

// GET /api/pharmacy/prescriptions/[id]/edit
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(req);

    // Check authorization - only pharmacist or admin
    if (
      !payload ||
      !(payload.role === "pharmacist" || payload.role === "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: prescriptionId } = await params;

    // Find prescription with populated references
    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name patientId phone email")
      .populate("doctor", "name specialization")
      .populate("appointment", "appointmentId appointmentDate");

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    // Calculate medication totals for display
    const medicationsWithTotals = prescription.medications.map((med) => ({
      ...med,
      totalPrice: med.price * med.quantity,
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...prescription.toObject(),
        medications: medicationsWithTotals,
      },
    });
  } catch (error: any) {
    console.error("Error fetching prescription:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch prescription",
      },
      { status: 500 },
    );
  }
}

// PUT /api/pharmacy/prescriptions/[id]/edit
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(req);

    // Check authorization - only pharmacist or admin
    if (
      !payload ||
      !(payload.role === "pharmacist" || payload.role === "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: prescriptionId } = await params;
    const body: UpdateBody = await req.json();
    const { medications, finalize } = body;

    // Find the prescription
    const prescription = await Prescription.findById(prescriptionId);

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    // Check if prescription is in a valid state for editing
    if (
      prescription.status === "cancelled" ||
      prescription.status === "expired"
    ) {
      return NextResponse.json(
        { error: "Cannot edit a cancelled or expired prescription" },
        { status: 400 },
      );
    }

    // Check if already fully dispensed
    if (prescription.dispensingStatus === "full") {
      return NextResponse.json(
        { error: "Cannot edit a fully dispensed prescription" },
        { status: 400 },
      );
    }

    let updated = false;
    let priceChanges: { index: number; oldPrice: number; newPrice: number }[] =
      [];

    // Update medication prices if provided
    if (medications && Array.isArray(medications) && medications.length > 0) {
      for (const medUpdate of medications) {
        const { index, price } = medUpdate;

        if (index < 0 || index >= prescription.medications.length) {
          return NextResponse.json(
            { error: `Invalid medication index: ${index}` },
            { status: 400 },
          );
        }

        if (price !== undefined && price >= 0) {
          const oldPrice = prescription.medications[index].price;
          if (oldPrice !== price) {
            priceChanges.push({ index, oldPrice, newPrice: price });
          }
          prescription.medications[index].price = price;
          updated = true;
        }
      }

      if (priceChanges.length > 0) {
        console.log("Price changes:", priceChanges);
      }
    }

    // Finalize prescription if requested
    if (finalize === true) {
      // Check if already finalized
      if ((prescription as any).pricingFinalized === true) {
        return NextResponse.json(
          { error: "Prescription prices already finalized" },
          { status: 400 },
        );
      }

      // Validate all medications have prices
      for (let i = 0; i < prescription.medications.length; i++) {
        if (
          prescription.medications[i].price === undefined ||
          prescription.medications[i].price === null
        ) {
          return NextResponse.json(
            {
              error: `Medication "${prescription.medications[i].name}" does not have a price set`,
              medicationIndex: i,
            },
            { status: 400 },
          );
        }
      }

      // Calculate charges from updated medications
      const basePrice = prescription.medications.reduce(
        (sum, med) => sum + med.price * med.quantity,
        0,
      );

      // Apply current charges
      const totalAmount =
        basePrice +
        prescription.charges.tax +
        prescription.charges.otherCharges -
        prescription.charges.discount;

      // Update charges
      prescription.charges.basePrice = basePrice;
      prescription.charges.totalAmount = totalAmount;
      prescription.charges.due = Math.max(
        0,
        totalAmount - prescription.charges.paid,
      );

      // Update payment status based on charges
      if (prescription.charges.due === 0 && totalAmount > 0) {
        prescription.charges.paymentStatus = "paid";
        prescription.paymentStatus = "verified";
      } else if (prescription.charges.paid > 0) {
        prescription.charges.paymentStatus = "partial";
        prescription.paymentStatus = "partial";
      } else {
        prescription.charges.paymentStatus = "unpaid";
        prescription.paymentStatus = "unpaid";
      }

      // Mark as pricing finalized
      (prescription as any).pricingFinalized = true;
      (prescription as any).pricingFinalizedAt = new Date();
      (prescription as any).pricingFinalizedBy = payload.id;

      updated = true;

      console.log("✅ Prescription finalized:", prescriptionId);
      console.log("   Total amount:", totalAmount);
    } else if (updated && !finalize) {
      // Recalculate charges if prices were updated but not finalizing
      const basePrice = prescription.medications.reduce(
        (sum, med) => sum + med.price * med.quantity,
        0,
      );

      prescription.charges.basePrice = basePrice;
      prescription.charges.totalAmount =
        basePrice +
        prescription.charges.tax +
        prescription.charges.otherCharges -
        prescription.charges.discount;
      prescription.charges.due = Math.max(
        0,
        prescription.charges.totalAmount - prescription.charges.paid,
      );
    }

    // Save the updated prescription
    if (updated) {
      await prescription.save();
    }

    // Fetch updated prescription with populated fields
    const updatedPrescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name patientId phone email")
      .populate("doctor", "name specialization");

    // Calculate medication totals for response
    const medicationsWithTotals = updatedPrescription!.medications.map(
      (med) => ({
        ...med,
        totalPrice: med.price * med.quantity,
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        ...updatedPrescription!.toObject(),
        medications: medicationsWithTotals,
      },
      message: finalize
        ? "Prescription finalized successfully"
        : "Prescription updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating prescription:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update prescription",
      },
      { status: 500 },
    );
  }
}
