// app/api/pharmacy/prescriptions/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Prescription } from "@/lib/models/Prescription";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { getTokenPayload } from "@/lib/auth/jwt";
import { z } from "zod";
import mongoose from "mongoose";

const UpdatePrescriptionSchema = z.object({
  status: z.enum(["active", "completed", "cancelled", "expired"]).optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid", "verified"]).optional(),
  paymentMethod: z.enum(["cash", "card", "insurance", "mobile"]).optional(),
  amountPaid: z.number().min(0).optional(),
});

export async function GET(
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

    // Find prescription with proper population
    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name patientId phone")
      .populate("doctor", "name specialization")
      .populate({
        path: "medications.medicine",
        select:
          "name form dosage frequency route currentQuantity sellingPrice unitPrice expiryDate supplier",
        model: "MedicineStock",
      });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    // Enhanced: Check if any medications need medicine data lookup
    const enhancedMedications = await Promise.all(
      prescription.medications.map(async (med: any) => {
        // If medicine is populated, return as is
        if (med.medicine && med.medicine._id) {
          return {
            ...(med.toObject ? med.toObject() : med),
            medicine: med.medicine,
          };
        }

        // If medicine is not populated (string ID), try to find it
        if (med.medicine && typeof med.medicine === "string") {
          try {
            const medicineDoc = await MedicineStock.findById(med.medicine);
            if (medicineDoc) {
              return {
                ...(med.toObject ? med.toObject() : med),
                medicine: medicineDoc,
              };
            }
          } catch (error) {
            console.warn(
              `Could not find medicine ${med.medicine} for medication ${med.name}`,
            );
          }
        }

        // If no medicine found, search by name as fallback
        if (!med.medicine && med.name) {
          try {
            const medicineByName = await MedicineStock.findOne({
              name: { $regex: new RegExp(`^${med.name}$`, "i") },
            });

            if (medicineByName) {
              return {
                ...(med.toObject ? med.toObject() : med),
                medicine: medicineByName,
              };
            }
          } catch (error) {
            console.warn(`Could not find medicine by name: ${med.name}`);
          }
        }

        // Return original if no medicine found
        return {
          ...(med.toObject ? med.toObject() : med),
          medicine: null,
        };
      }),
    );

    // Create enhanced prescription object
    const enhancedPrescription = {
      ...prescription.toObject(),
      medications: enhancedMedications,
    };

    return NextResponse.json({
      success: true,
      data: enhancedPrescription,
    });
  } catch (error: any) {
    console.error("Error fetching prescription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch prescription" },
      { status: 500 },
    );
  }
}

export async function PATCH(
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
    const validation = UpdatePrescriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const prescription = await Prescription.findById(prescriptionId);

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    // Update fields if provided
    if (validation.data.status !== undefined) {
      prescription.status = validation.data.status;
    }

    if (validation.data.paymentStatus !== undefined) {
      prescription.paymentStatus = validation.data.paymentStatus;
    }

    if (validation.data.paymentMethod !== undefined) {
      prescription.charges.paymentMethod = validation.data.paymentMethod;
    }

    if (validation.data.amountPaid !== undefined) {
      prescription.charges.paid = validation.data.amountPaid;
      prescription.charges.due = Math.max(
        0,
        prescription.charges.totalAmount - validation.data.amountPaid,
      );

      // Update payment status based on amount paid
      if (
        prescription.charges.due === 0 &&
        prescription.charges.totalAmount > 0
      ) {
        prescription.charges.paymentStatus = "paid";
        prescription.paymentStatus = "verified";
        prescription.paymentVerified = true;
        prescription.paymentVerifiedAt = new Date();
        prescription.paymentVerifiedBy = new mongoose.Types.ObjectId(
          payload.id,
        );
      } else if (prescription.charges.paid > 0) {
        prescription.charges.paymentStatus = "partial";
        prescription.paymentStatus = "partial";
      } else {
        prescription.charges.paymentStatus = "unpaid";
        prescription.paymentStatus = "unpaid";
      }
    }

    await prescription.save();

    // Fetch updated prescription with populated fields
    const updatedPrescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name patientId phone")
      .populate("doctor", "name specialization")
      .populate({
        path: "medications.medicine",
        select:
          "name form dosage frequency route currentQuantity sellingPrice unitPrice",
        model: "MedicineStock",
      });

    return NextResponse.json({
      success: true,
      data: updatedPrescription,
      message: "Prescription updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating prescription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update prescription" },
      { status: 500 },
    );
  }
}
