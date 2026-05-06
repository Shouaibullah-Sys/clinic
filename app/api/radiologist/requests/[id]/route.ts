// app/api/radiologist/requests/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const allowedRoles = ["radiologist", "admin", "doctor"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access radiology requests." },
        { status: 403 }
      );
    }

    const { id: requestId } = await params;

    console.log(`Radiology request requested by ${auth.userRole} ${auth.userName}: ${requestId}`);

    const requestDoc = await prisma.radiologyRequest.findUnique({
      where: { id: requestId },
      include: {
        patient: { select: { name: true, patientId: true, phone: true, guardian: true, dateOfBirth: true, gender: true } },
        referringDoctor: { select: { name: true, specialization: true, department: true, licenseNumber: true } },
        radiologist: { select: { name: true } },
        technician: { select: { name: true } },
        department: { select: { name: true } },
      },
    });

    if (!requestDoc) {
      return NextResponse.json(
        { success: false, error: "Radiology request not found" },
        { status: 404 }
      );
    }

    if (auth.userRole === "doctor" && requestDoc.referringDoctorId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You can only access your own radiology requests." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: requestDoc,
      userRole: auth.userRole
    });

  } catch (error: any) {
    console.error("Error fetching radiology request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch radiology request" },
      { status: 500 }
    );
  }
}
