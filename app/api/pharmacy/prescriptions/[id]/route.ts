// app/api/pharmacy/prescriptions/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Prescription } from "@/lib/models/Prescription";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
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
    
    // Find prescription with proper population
    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name patientId phone")
      .populate("doctor", "name specialization")
      .populate({
        path: "medications.medicine",
        select: "name batchNumber currentQuantity sellingPrice unitPrice expiryDate supplier",
        model: "MedicineStock"
      });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 }
      );
    }

    // Enhanced: Check if any medications need medicine data lookup
    const enhancedMedications = await Promise.all(
      prescription.medications.map(async (med: any) => {
        // If medicine is populated, return as is
        if (med.medicine && med.medicine._id) {
          return {
            ...med.toObject ? med.toObject() : med,
            medicine: med.medicine
          };
        }
        
        // If medicine is not populated (string ID), try to find it
        if (med.medicine && typeof med.medicine === 'string') {
          try {
            const medicineDoc = await MedicineStock.findById(med.medicine);
            if (medicineDoc) {
              return {
                ...med.toObject ? med.toObject() : med,
                medicine: medicineDoc
              };
            }
          } catch (error) {
            console.warn(`Could not find medicine ${med.medicine} for medication ${med.name}`);
          }
        }
        
        // If no medicine found, search by name as fallback
        if (!med.medicine && med.name) {
          try {
            const medicineByName = await MedicineStock.findOne({
              name: { $regex: new RegExp(`^${med.name}$`, 'i') }
            });
            
            if (medicineByName) {
              return {
                ...med.toObject ? med.toObject() : med,
                medicine: medicineByName
              };
            }
          } catch (error) {
            console.warn(`Could not find medicine by name: ${med.name}`);
          }
        }
        
        // Return original if no medicine found
        return {
          ...med.toObject ? med.toObject() : med,
          medicine: null
        };
      })
    );

    // Create enhanced prescription object
    const enhancedPrescription = {
      ...prescription.toObject(),
      medications: enhancedMedications
    };

    return NextResponse.json({
      success: true,
      data: enhancedPrescription,
    });
  } catch (error: any) {
    console.error("Error fetching prescription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch prescription" },
      { status: 500 }
    );
  }
}