import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

const canAccessLaboratory = (role: string | undefined) => {
  return ["admin", "doctor", "lab_technician", "receptionist"].includes(role || "");
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!canAccessLaboratory(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to enter exam results." },
        { status: 403 }
      );
    }

    const { id: testId } = await params;
    const body = await request.json();
    
    const { parameters, interpretation } = body;

    if (!parameters || !Array.isArray(parameters) || parameters.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one test parameter is required" },
        { status: 400 }
      );
    }

    const test = await prisma.labTest.findUnique({
      where: { id: testId },
    });
    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }

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

    const results = {
      parameters: parameters.map((param: any) => ({
        name: param.name,
        value: param.value,
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        flag: param.flag || "normal",
        remarks: param.remarks || "",
      })),
      interpretation: interpretation || "",
    };

    const updatedTest = await prisma.labTest.update({
      where: { id: testId },
      data: {
        processingStatus: "completed",
        status: "completed",
        results: JSON.stringify(results),
        reportedDate: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Exam results saved successfully",
      data: updatedTest,
    });

  } catch (error: any) {
    console.error("Error saving exam results:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save exam results" },
      { status: 500 }
    );
  }
}