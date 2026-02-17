// app/api/radiology/records/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { RadiologyService } from "@/lib/models/RadiologyService";
import { authenticateRequest } from "@/lib/auth";

// GET: Get a single radiology record by ID (any exam type - direct or appointment-based)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
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
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
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
    console.log(
      `[DEBUG] ID length: ${examId.length}, Is valid ObjectId: ${/^[a-f\d]{24}$/i.test(examId)}`,
    );

    // Try to find in RadiologyExam collection first (direct exams)
    const examResult = await RadiologyExam.findById(examId)
      .populate("patient", "name patientId phone guardian dateOfBirth gender")
      .populate("doctor", "name specialization")
      .populate("createdBy", "name")
      .populate("finalizedBy", "name")
      .populate("printedBy", "name")
      .populate("charges.collectedBy", "name")
      .populate("paymentVerifiedBy", "name")
      .populate("results.reportedBy", "name")
      .populate("results.verifiedBy", "name")
      .lean();

    let radiologyExam = examResult as Record<string, any> | null;

    // If not found in RadiologyExam, try RadiologyService (appointment-based exams)
    if (!radiologyExam) {
      console.log(
        `[DEBUG] Not found in RadiologyExam, checking RadiologyService...`,
      );
      const serviceResult = await RadiologyService.findById(examId)
        .populate("patient", "name patientId phone guardian dateOfBirth gender")
        .populate("referringDoctor", "name specialization")
        .populate("radiologist", "name")
        .populate("technician", "name")
        .populate("charges.collectedBy", "name")
        .populate("paymentVerifiedBy", "name")
        .lean();

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
          ...serviceResult,
          examId: serviceResult.serviceId,
          examName: serviceResult.serviceType + " - " + serviceResult.bodyPart,
          category: categoryMap[serviceResult.serviceType] || "other",
          examStatus: serviceResult.status,
          doctor: serviceResult.referringDoctor,
          isDirectExam: false,
          modality: {
            type: serviceResult.serviceType,
            bodyPart: serviceResult.bodyPart,
            view: serviceResult.view,
            contrastUsed: serviceResult.contrastUsed,
            contrastType: serviceResult.contrastType,
            remarks: serviceResult.notes,
          },
          results: {
            findings: serviceResult.findings
              ? [
                  {
                    name: "Narrative Findings",
                    value: serviceResult.findings,
                    unit: "",
                    normalRange: "",
                    remarks: "",
                  },
                ]
              : [],
            impression: serviceResult.report?.impression || serviceResult.impression,
            reportedBy: serviceResult.reportGeneratedBy,
            reportedAt: serviceResult.reportGeneratedAt,
            verifiedBy: serviceResult.reviewedBy,
            verifiedAt: serviceResult.reviewedAt,
          },
          report: serviceResult.report || undefined,
        };
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
    const isRadiologyUser = radiologyRoles.includes(auth.userRole);

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
