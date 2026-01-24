// app/api/laboratory/tests/[id]/collect/info/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";

export async function GET(
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
        { success: false, error: "Forbidden. You don't have permission to access lab tests." },
        { status: 403 }
      );
    }

    const { id: testId } = await params;

    const test = await LabTest.findById(testId)
      .populate("patient", "name patientId phone")
      .populate("doctor", "name")
      .lean();

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: test,
    });

  } catch (error: any) {
    console.error("Error fetching test info for collection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch test information" },
      { status: 500 }
    );
  }
}