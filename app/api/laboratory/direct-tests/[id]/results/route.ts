// app/api/laboratory/direct-tests/[id]/results/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// PUT: Add results to a direct lab test
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Only lab technicians can add results
    if (auth.userRole !== "lab_technician" && auth.userRole !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Only lab technicians can add test results",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;
    const body = await request.json();
    const { parameters, interpretation } = body;

    // Find test
    const test = await LabTest.findById(testId);

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    // Verify this is a direct test
    if (!test.isDirectTest) {
      return NextResponse.json(
        { success: false, error: "This is not a direct lab test" },
        { status: 400 },
      );
    }

    // Check if test is already completed
    if (test.status === "completed" || test.status === "reported") {
      return NextResponse.json(
        { success: false, error: "Test results have already been entered" },
        { status: 400 },
      );
    }

    // Check payment verification
    if (!test.paymentVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment must be verified before adding results",
        },
        { status: 400 },
      );
    }

    // Validate parameters
    if (!parameters || !Array.isArray(parameters) || parameters.length === 0) {
      return NextResponse.json(
        { success: false, error: "Test parameters are required" },
        { status: 400 },
      );
    }

    // Update test with results
    test.results = {
      parameters: parameters.map((p: any) => ({
        name: p.name,
        value: p.value,
        unit: p.unit || "",
        normalRange: p.normalRange || "",
        flag: p.flag || "normal",
        remarks: p.remarks || "",
      })),
      interpretation: interpretation || "",
      reportedBy: new mongoose.Types.ObjectId(auth.userId),
      reportedAt: new Date(),
    };

    // For direct tests, set status to "completed" when results are added
    // Direct tests don't require sample collection
    test.status = "completed";
    test.processingStatus = "completed";
    test.completedAt = new Date();

    await test.save();

    // Return updated test
    const updatedTest = await LabTest.findById(testId)
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .populate("results.reportedBy", "name")
      .lean();

    console.log(
      `Results added for direct lab test ${test.testId} by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: updatedTest,
      message: "Test results added successfully",
    });
  } catch (error: any) {
    console.error("Error adding test results:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to save test results",
      },
      { status: 500 },
    );
  }
}
