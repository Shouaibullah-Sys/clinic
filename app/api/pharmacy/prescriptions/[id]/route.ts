import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Prescription } from "@/lib/models/Prescription";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
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
    
    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name patientId phone")
      .populate("doctor", "name specialization")
      .populate({
        path: "medications.medicine",
        select: "name batchNumber currentQuantity sellingPrice unitPrice",
        model: "MedicineStock"
      });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    console.error("Error fetching prescription:", error);
    return NextResponse.json(
      { error: "Failed to fetch prescription" },
      { status: 500 }
    );
  }
}