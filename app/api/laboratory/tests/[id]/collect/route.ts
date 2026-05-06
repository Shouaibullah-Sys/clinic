import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, canAccessLaboratory, hasRequiredRole } from "@/lib/auth";

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

    if (!canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to collect samples.",
        },
        { status: 403 },
      );
    }

    const allowedRoles = ["lab_technician", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only lab staff can collect samples.",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;
    const body = await request.json();

    const {
      sampleCondition = "satisfactory",
      collectionNotes,
      sampleConditionNotes,
      specimen,
      testParameters,
    } = body;

    const test = await prisma.labTest.findUnique({
      where: { id: testId },
    });

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    if (test.sampleCollected) {
      return NextResponse.json(
        {
          success: false,
          error: "Sample has already been collected",
        },
        { status: 400 },
      );
    }

    const updatedTest = await prisma.labTest.update({
      where: { id: testId },
      data: {
        sampleCollected: true,
        sampleDate: new Date(),
        status: "completed",
        ...(collectionNotes !== undefined && { notes: collectionNotes }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTest,
      message: "Sample collected successfully",
    });
  } catch (error: any) {
    console.error("Error collecting sample:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to collect sample",
      },
      { status: 500 },
    );
  }
}