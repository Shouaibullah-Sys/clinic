import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: prescriptionId } = await params;
    const user = await getTokenPayload(request);
    if (!user || !["doctor", "pharmacist", "admin"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        doctor: { select: { name: true } },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { success: false, error: "Prescription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: prescription });
  } catch (error: any) {
    console.error("Error fetching prescription:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch prescription" },
      { status: 500 }
    );
  }
}