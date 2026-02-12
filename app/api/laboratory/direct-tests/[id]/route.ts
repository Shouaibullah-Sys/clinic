// app/api/laboratory/direct-tests/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest } from "@/lib/auth";

const normalizeDirectTestWorkflow = (test: any) => {
  const isCollected = test.collectionStatus === "collected";
  const hasResults = (test.results?.parameters?.length || 0) > 0;

  if (!isCollected) return test;

  return {
    ...test,
    status:
      test.status === "pending" ||
      test.status === "ordered" ||
      test.status === "processing"
        ? "completed"
        : test.status,
    processingStatus: "completed",
    readyForPrint: hasResults ? true : test.readyForPrint,
  };
};

// GET: Get a single direct lab test by ID
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

    // Check if user has access to laboratory
    const allowedRoles = ["lab_technician", "admin", "receptionist", "doctor"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to access direct lab tests.",
        },
        { status: 403 },
      );
    }

    // Unwrap the params promise
    const { id: testId } = await params;

    // Find the lab test
    const labTest = await LabTest.findById(testId)
      .populate("patient", "name patientId phone email dateOfBirth gender")
      .populate("doctor", "name specialization")
      .populate("createdBy", "name")
      .populate("finalizedBy", "name")
      .populate("printedBy", "name")
      .populate("charges.collectedBy", "name")
      .populate("paymentVerifiedBy", "name")
      .populate("results.reportedBy", "name")
      .populate("results.verifiedBy", "name")
      .lean();

    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    // Verify this is a direct test
    if (!labTest.isDirectTest) {
      return NextResponse.json(
        { success: false, error: "This is not a direct lab test" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: normalizeDirectTestWorkflow(labTest),
    });
  } catch (error: any) {
    console.error("Error fetching direct lab test:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch direct lab test",
      },
      { status: 500 },
    );
  }
}
