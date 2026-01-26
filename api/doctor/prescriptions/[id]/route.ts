// app/api/doctor/prescriptions/[id]/route.ts - CREATE THIS IF IT DOESN'T EXIST
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

  if (!payload || !(payload.role === "doctor" || payload.role === "admin" || payload.role === "pharmacist")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: prescriptionId } = await params;
    
    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name patientId phone")
      .populate("doctor", "name specialization")
      .populate("medications.medicine", "name batchNumber currentQuantity sellingPrice unitPrice");

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