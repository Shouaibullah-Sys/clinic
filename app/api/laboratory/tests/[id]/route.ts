// app/api/laboratory/tests/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";
import mongoose from "mongoose";

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
      `Lab test requested by ${auth.userRole} ${auth.userName}: ${testId}`,
    );

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return NextResponse.json(
        { success: false, error: "Invalid lab test id" },
        { status: 400 },
      );
    }

    // Find the test by ID
    const test = await LabTest.findById(testId)
      .populate("patient", "name patientId phone guardian dateOfBirth gender")
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
    if (
      auth.userRole === "doctor" &&
      test.doctor &&
      test.doctor.toString() !== auth.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You can only access your own lab tests.",
        },
        { status: 403 },
      );
    }

    const normalizedTest =
      test.collectionStatus === "collected" &&
      test.processingStatus === "pending"
        ? {
            ...test,
            processingStatus: "completed",
            status:
              test.status === "collected" ? "completed" : (test.status as any),
          }
        : test;

    return NextResponse.json({
      success: true,
      data: normalizedTest,
      userRole: auth.userRole,
    });
  } catch (error: any) {
    console.error("Error fetching lab test:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab test" },
      { status: 500 },
    );
  }
}
