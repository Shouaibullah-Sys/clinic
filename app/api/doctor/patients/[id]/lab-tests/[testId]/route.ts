import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";

// GET: Get a specific lab test with full results for the ordering doctor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; testId: string }> },
) {
  try {
    const { id: patientId, testId } = await params;

    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    if (!hasRequiredRole(auth.userRole, ["doctor", "admin"])) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return NextResponse.json(
        { success: false, error: "Invalid test ID" },
        { status: 400 },
      );
    }

    const doctorId = new mongoose.Types.ObjectId(auth.userId!);

    const labTest = await LabTest.findOne({
      _id: testId,
      patient: patientId,
      $or: [{ doctor: doctorId }, { orderedBy: doctorId }],
    })
      .populate("patient", "name patientId phone dateOfBirth gender")
      .populate("doctor", "name specialization")
      .populate("orderedBy", "name")
      .populate("results.reportedBy", "name")
      .populate("results.verifiedBy", "name")
      .populate("verificationDetails.verifiedBy", "name")
      .populate("appointment", "appointmentId date")
      .lean();

    if (!labTest) {
      return NextResponse.json(
        {
          success: false,
          error: "Lab test not found or you do not have access to this test",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: labTest,
    });
  } catch (error: any) {
    console.error("Error fetching lab test details for doctor:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab test" },
      { status: 500 },
    );
  }
}
