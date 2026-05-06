// app/api/radiology/records/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

// GET: Get a single radiology record by ID (any exam type - direct or appointment-based)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate the request
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Check if user has access to radiology
    const allowedRoles = [
      "radiology_technician",
      "radiologist",
      "admin",
      "receptionist",
      "doctor",
    ];
    if (!allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to access radiology records.",
        },
        { status: 403 },
      );
    }

    // Unwrap the params promise
    const { id: examId } = await params;

    // DEBUG: Log the ID being queried
    console.log(`[DEBUG] Fetching radiology record with ID: ${examId}`);

    // Try to find in RadiologyExam collection first (direct exams)
    const examResult = await prisma.radiologyExam.findUnique({
      where: { id: examId },
    });

    let radiologyExam = examResult;

    // If not found in RadiologyExam, try RadiologyService (appointment-based exams)
    if (!radiologyExam) {
      console.log(
        `[DEBUG] Not found in RadiologyExam, checking RadiologyService...`,
      );
      const serviceResult = await prisma.radiologyService.findUnique({
        where: { id: examId },
      });

      if (serviceResult) {
        // Map serviceType to category
        const categoryMap: Record<string, string> = {
          "x-ray": "xray",
          "ct-scan": "ct",
          mri: "mri",
          ultrasound: "ultrasound",
        };

        // Normalize RadiologyService data to match RadiologyExam format
        radiologyExam = {
          id: serviceResult.id,
          examId: serviceResult.serviceId,
          examName: serviceResult.name + " - " + (serviceResult as any).bodyPart,
          category: categoryMap[(serviceResult as any).serviceType] || "other",
          examStatus: serviceResult.active ? "completed" : "pending",
          doctor: (serviceResult as any).referringDoctor,
          isDirectExam: false,
          modality: {
            type: (serviceResult as any).serviceType,
            bodyPart: (serviceResult as any).bodyPart,
            view: (serviceResult as any).view,
            contrastUsed: (serviceResult as any).contrastUsed,
            contrastType: (serviceResult as any).contrastType,
            remarks: (serviceResult as any).notes,
          },
          results: JSON.stringify({
            findings: (serviceResult as any).findings
              ? [
                  {
                    name: "Narrative Findings",
                    value: (serviceResult as any).findings,
                    unit: "",
                    normalRange: "",
                    remarks: "",
                  },
                ]
              : [],
            impression: (serviceResult as any).report?.impression || (serviceResult as any).impression,
            reportedBy: (serviceResult as any).reportGeneratedBy,
            reportedAt: (serviceResult as any).reportGeneratedAt,
            verifiedBy: (serviceResult as any).reviewedBy,
            verifiedAt: (serviceResult as any).reviewedAt,
          }),
          report: (serviceResult as any).report || undefined,
          paymentVerified: (serviceResult as any).paymentVerified,
        } as any;
        console.log(`[DEBUG] Found record in RadiologyService collection`);
      }
    } else {
      console.log(`[DEBUG] Found record in RadiologyExam collection`);
    }

    if (!radiologyExam) {
      return NextResponse.json(
        { success: false, error: "Radiology record not found" },
        { status: 404 },
      );
    }

    // For radiology roles, allow access regardless of payment verification
    const radiologyRoles = ["radiology_technician", "radiologist"];
    const isRadiologyUser = radiologyRoles.includes(payload.role);

    // Only enforce payment verification for non-radiology roles
    if (!isRadiologyUser && !radiologyExam.paymentVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment has not been verified for this radiology record.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      data: radiologyExam,
    });
  } catch (error: any) {
    console.error("Error fetching radiology record:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch radiology record",
      },
      { status: 500 },
    );
  }
}