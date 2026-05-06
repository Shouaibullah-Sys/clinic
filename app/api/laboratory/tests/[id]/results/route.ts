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
          error: "Only lab technicians can add test parameters",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;
    const body = await request.json();
    const { parameters, interpretation, processingStatus } = body;

    const test = await prisma.labTest.findUnique({
      where: { id: testId },
    });

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
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
            remarks: p.remarks || "",
            group: p.group || undefined,
            flag: p.flag || "normal",
          })),
          interpretation: interpretation || "",
          reportedBy: auth.userId,
          reportedAt: new Date(),
        }),
        ...(processingStatus && { status: processingStatus }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTest,
      message: "Test parameters added successfully",
    });
  } catch (error: any) {
    console.error("Error adding test parameters:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to save test parameters",
      },
      { status: 500 },
    );
  }
}