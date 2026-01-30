// app/api/laboratory/tests/[id]/print/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";

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
    await dbConnect();

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Check if user can access laboratory
    if (!canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to access lab tests.",
        },
        { status: 403 },
      );
    }

    // Unwrap the params promise
    const { id: testId } = await params;

    console.log(
      `Lab test print requested by ${auth.userRole} ${auth.userName}: ${testId}`,
    );

    // Find the test by ID with all necessary populated fields
    const test = await LabTest.findById(testId)
      .populate("patient", "name patientId phone email dateOfBirth gender")
      .populate("doctor", "name specialization department licenseNumber")
      .populate("orderedBy", "name")
      .populate("charges.collectedBy", "name")
      .populate("collectionDetails.collectedBy", "name")
      .populate("processingDetails.processedBy", "name")
      .populate("verificationDetails.verifiedBy", "name")
      .populate("paymentVerifiedBy", "name")
      .populate("results.reportedBy", "name")
      .populate("results.verifiedBy", "name")
      .lean();

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    // If user is doctor, check if they can access this test
    if (auth.userRole === "doctor" && test.doctor?.toString() !== auth.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You can only access your own lab tests.",
        },
        { status: 403 },
      );
    }

    // Check if test has results (required for printing)
    if (
      !test.results ||
      !test.results.parameters ||
      test.results.parameters.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Test results are not available yet. Cannot print report.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: test,
      userRole: auth.userRole,
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
