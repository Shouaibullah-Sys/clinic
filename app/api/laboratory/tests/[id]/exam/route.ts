// app/api/laboratory/tests/[id]/exam/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(
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

    if (!canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to enter exam results." },
        { status: 403 }
      );
    }

    const { id: testId } = await params;
    const body = await request.json();
    
    const { parameters, interpretation, technicianNotes } = body;

    // Validate required fields
    if (!parameters || !Array.isArray(parameters) || parameters.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one test parameter is required" },
        { status: 400 }
      );
    }

    // Find the test
    const test = await LabTest.findById(testId);
    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }

    // Check if exam can be entered
    if (test.collectionStatus !== "collected") {
      return NextResponse.json(
        { success: false, error: "Sample must be collected before entering exam results" },
        { status: 400 }
      );
    }

    if (test.processingStatus === "completed") {
      return NextResponse.json(
        { success: false, error: "Exam results have already been entered for this test" },
        { status: 400 }
      );
    }

    // Update test with exam results
    test.processingStatus = "completed";
    test.status = "completed";
    test.results = {
      parameters: parameters.map((param: any) => ({
        name: param.name,
        value: param.value,
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        flag: param.flag || "normal",
        remarks: param.remarks || "",
      })),
      interpretation: interpretation || "",
      reportedBy: new mongoose.Types.ObjectId(auth.userId),
      reportedAt: new Date(),
    };

    await test.save();

    return NextResponse.json({
      success: true,
      message: "Exam results saved successfully",
      data: test,
    });

  } catch (error: any) {
    console.error("Error saving exam results:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save exam results" },
      { status: 500 }
    );
  }
}