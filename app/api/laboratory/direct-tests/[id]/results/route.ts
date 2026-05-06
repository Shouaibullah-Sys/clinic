import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

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

    const test = await prisma.labTest.findUnique({
      where: { id: testId },
    });

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    if (!test.isDirectTest) {
      return NextResponse.json(
        { success: false, error: "This is not a direct lab test" },
        { status: 400 },
      );
    }

    if (test.finalized) {
      return NextResponse.json(
        {
          success: false,
          error: "Test has been finalized and results cannot be edited",
        },
        { status: 400 },
      );
    }

    if (!parameters || !Array.isArray(parameters) || parameters.length === 0) {
      return NextResponse.json(
        { success: false, error: "Test parameters are required" },
        { status: 400 },
      );
    }

    const updatedTest = await prisma.labTest.update({
      where: { id: testId },
      data: {
        results: JSON.stringify({
          parameters: parameters.map((p: any) => ({
            name: p.name,
            value: p.value,
            unit: p.unit || "",
            normalRange: p.normalRange || "",
            flag: p.flag || "normal",
            remarks: p.remarks || "",
            group: p.group || undefined,
          })),
          interpretation: interpretation || "",
        }),
        status: "completed",
        processingStatus: "completed",
        readyForPrint: true,
      },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        createdBy: { select: { name: true } },
      },
    });

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