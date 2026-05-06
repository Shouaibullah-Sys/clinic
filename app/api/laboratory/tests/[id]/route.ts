import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";

export async function GET(
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
          error: "Forbidden. You don't have permission to access lab tests.",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;

    console.log(
      `Lab test requested by ${auth.userRole} ${auth.userName}: ${testId}`,
    );

    const test = await prisma.labTest.findUnique({
      where: { id: testId },
    });

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    if (
      auth.userRole === "doctor" &&
      test.doctorId !== auth.userId
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
      test.sampleCollected === true &&
      test.status !== "reported"
        ? {
            ...test,
            status: test.status === "collected" ? "completed" : test.status,
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