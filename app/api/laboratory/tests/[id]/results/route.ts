// app/api/laboratory/tests/[id]/results/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Only lab technicians can add results
    if (auth.userRole !== "lab_technician" && auth.userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only lab technicians can add test parameters" },
        { status: 403 }
      );
    }

    const { id: testId } = await params;
    const body = await request.json();
    const { parameters, status, processingStatus } = body;

    // Find the test
    const test = await LabTest.findById(testId);
    
    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }

    // Check if test is already completed
    if (test.status === "completed" || test.status === "reported") {
      return NextResponse.json(
        { success: false, error: "Test results have already been entered" },
        { status: 400 }
      );
    }

    // Check payment verification for routine tests
    if (test.priority === "routine" && !test.paymentVerified) {
      return NextResponse.json(
        { success: false, error: "Payment must be verified before adding results" },
        { status: 400 }
      );
    }

    // Update test with results
    test.results = {
      parameters: parameters.map((p: any) => ({
        name: p.name,
        value: p.value,
        unit: p.unit || "",
        normalRange: p.normalRange || "",
        remarks: p.remarks || ""
      })),
      reportedBy: new mongoose.Types.ObjectId(auth.userId),
      reportedAt: new Date()
    };

    // Update status
    if (status) test.status = status;
    if (processingStatus) test.processingStatus = processingStatus;
    
    // Set completed time
    test.completedAt = new Date();

    await test.save();

    // Return updated test
    const updatedTest = await LabTest.findById(testId)
      .populate("patient", "name patientId")
      .populate("doctor", "name")
      .populate("results.reportedBy", "name")
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedTest,
      message: "Test parameters added successfully"
    });

  } catch (error: any) {
    console.error("Error adding test parameters:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save test parameters" },
      { status: 500 }
    );
  }
}