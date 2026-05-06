// app/api/appointments/[id]/imaging/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";
import { buildMarkedOnlyQuery } from "@/lib/utils/markedTransactions";

// GET: Get imaging studies for an appointment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate request using centralized auth
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Check if user is authorized (doctor, receptionist, admin, radiology staff)
    const allowedRoles = [
      "doctor",
      "receptionist",
      "admin",
      "radiologist",
      "technician",
    ];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Access denied.",
          userRole: auth.userRole,
          allowedRoles: allowedRoles,
        },
        { status: 403 },
      );
    }

    const { id: appointmentId } = await params;

    // Verify appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }

    const { query: finalQuery } = await buildMarkedOnlyQuery({
      userId: auth.userId!,
      module: "radiology",
      baseQuery: { appointmentId },
    });

    // Get imaging studies for this appointment
    const imagingStudies = await prisma.radiologyExam.findMany({
      where: finalQuery,
      select: {
        id: true,
        examId: true,
        serviceId: true,
        category: true,
        date: true,
        status: true,
        reportDate: true,
        findings: true,
        impression: true,
        charges: true,
        paymentVerified: true,
        patient: {
          select: {
            name: true,
            patientId: true,
          },
        },
        doctor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(
      {
        success: true,
        data: imagingStudies,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error: any) {
    console.error("Error fetching imaging studies:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch imaging studies",
      },
      { status: 500 },
    );
  }
}