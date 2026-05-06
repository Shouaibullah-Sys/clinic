import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const userId = auth.userId!;
    const userRole = auth.userRole!;

    if (!["receptionist", "lab_technician", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only authorized staff can verify payments." },
        { status: 403 }
      );
    }

    const { id: testId } = await params;
    const body = await request.json();
    const { verify = true, notes } = body;

    const labTest = await prisma.labTest.findUnique({
      where: { id: testId },
    });

    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }

    if (labTest.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot verify payment for cancelled test" },
        { status: 400 }
      );
    }

    if (verify) {
      const updatedTest = await prisma.labTest.update({
        where: { id: testId },
        data: {
          paid: labTest.totalAmount,
          due: 0,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedTest,
        message: "Payment verified successfully",
      });
    } else {
      const updatedTest = await prisma.labTest.update({
        where: { id: testId },
        data: {
          paid: 0,
          due: labTest.totalAmount,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedTest,
        message: "Payment verification removed",
      });
    }

  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}