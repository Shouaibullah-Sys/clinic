// app/api/laboratory/tests/[id]/print/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";
import { canAccessLaboratory } from "@/lib/auth";

/**
 * GET /api/laboratory/tests/[id]/print
 *
 * Fetches test data for PDF generation/printing.
 * Returns the complete test object with all necessary data for generating a PDF report.
 *
 * This endpoint is used by the LabTestPDFGenerator component to retrieve test data
 * before generating the PDF on the client side.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!canAccessLaboratory(payload.role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to access lab tests.",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;

    console.log(
      `Lab test print requested by ${payload.role} ${payload.name}: ${testId}`,
    );

    const test = await prisma.labTest.findUnique({
      where: { id: testId },
      include: {
        patient: {
          select: {
            name: true,
            patientId: true,
            phone: true,
            guardian: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        doctor: {
          select: {
            name: true,
            specialization: true,
            department: true,
            licenseNumber: true,
          },
        },
        orderedBy: { select: { name: true } },
      },
    });

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    if (payload.role === "doctor" && test.doctorId !== payload.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You can only access your own lab tests.",
        },
        { status: 403 },
      );
    }

    const results = typeof test.testParameters === "string"
      ? JSON.parse(test.testParameters)
      : test.testParameters;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Test results are not available yet. Cannot print report.",
        },
        { status: 400 },
      );
    }

    const charges = typeof test.charges === "string"
      ? JSON.parse(test.charges)
      : test.charges;

    return NextResponse.json({
      success: true,
      data: { ...test, results: { parameters: results }, charges },
      userRole: payload.role,
    });
  } catch (error: any) {
    console.error("Error fetching lab test for print:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch lab test for printing",
      },
      { status: 500 },
    );
  }
}