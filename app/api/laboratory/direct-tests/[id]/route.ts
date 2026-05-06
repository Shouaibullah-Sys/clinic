import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

const normalizeDirectTestWorkflow = (test: any) => {
  const isCollected = test.collectionStatus === "collected";
  const hasResults = (test.results?.parameters?.length || 0) > 0;

  if (!isCollected) return test;

  return {
    ...test,
    status:
      test.status === "pending" ||
      test.status === "ordered" ||
      test.status === "processing"
        ? "completed"
        : test.status,
    processingStatus: "completed",
    readyForPrint: hasResults ? true : test.readyForPrint,
  };
};

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

    const allowedRoles = ["lab_technician", "admin", "receptionist", "doctor"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to access direct lab tests.",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;

    const labTest = await prisma.labTest.findUnique({
      where: { id: testId },
      include: {
        patient: {
          select: {
            name: true,
            patientId: true,
            phone: true,
            guardian: true,
            dateOfBirth: true,
            gender: true,
            address: true,
            refPerson: true,
            passTskNo: true,
            registrationNo: true,
          },
        },
        doctor: { select: { name: true, specialization: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    if (!labTest.isDirectTest) {
      return NextResponse.json(
        { success: false, error: "This is not a direct lab test" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: normalizeDirectTestWorkflow(labTest),
    });
  } catch (error: any) {
    console.error("Error fetching direct lab test:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch direct lab test",
      },
      { status: 500 },
    );
  }
}