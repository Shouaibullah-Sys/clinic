import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";
import { z } from "zod";

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
    const payload = await getTokenPayload(req);

    if (
      !payload ||
      !((payload.role === "pharmacist" || payload.role === "pharmacy_head") || payload.role === "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: prescriptionId } = await params;

    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        doctor: { select: { name: true, specialization: true } },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    const medications = prescription.medications;

    return NextResponse.json({
      success: true,
      data: {
        ...prescription,
        medications,
      },
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
    const payload = await getTokenPayload(req);

    if (
      !payload ||
      !((payload.role === "pharmacist" || payload.role === "pharmacy_head") || payload.role === "admin")
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

    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    const updateData: any = {};

    if (validation.data.status !== undefined) {
      updateData.status = validation.data.status;
    }

    if (validation.data.paymentStatus !== undefined) {
      updateData.paymentStatus = validation.data.paymentStatus;
    }

    if (validation.data.paymentMethod !== undefined) {
      const charges = JSON.parse(prescription.charges);
      charges.paymentMethod = validation.data.paymentMethod;
      updateData.charges = JSON.stringify(charges);
    }

    if (validation.data.amountPaid !== undefined) {
      updateData.amountPaid = validation.data.amountPaid;
      updateData.paymentStatus = "paid";
    }

    const updatedPrescription = await prisma.prescription.update({
      where: { id: prescriptionId },
      data: updateData,
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        doctor: { select: { name: true, specialization: true } },
      },
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