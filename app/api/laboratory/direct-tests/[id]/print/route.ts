import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

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
    if (!allowedRoles.includes(auth.userRole!)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to access lab tests.",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;

    const test = await prisma.labTest.findUnique({
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
        doctor: { select: { name: true, specialization: true, department: true, licenseNumber: true } },
        createdBy: { select: { name: true } },
        orderedBy: { select: { name: true } },
      },
    });

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    if (auth.userRole === "doctor" && test.doctorId !== auth.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You can only access your own lab tests.",
        },
        { status: 403 },
      );
    }

    const results = test.results as any;
    if (!results || !results.parameters || results.parameters.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Test results are not available yet. Cannot print report.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: test,
      userRole: auth.userRole,
    });
  } catch (error: any) {
    console.error("Error fetching direct lab test for print:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch direct lab test for printing",
      },
      { status: 500 },
    );
  }
}

export async function POST(
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

    const allowedRoles = ["lab_technician", "admin"];
    if (!allowedRoles.includes(auth.userRole!)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only laboratory staff can mark tests as printed.",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;

    const labTest = await prisma.labTest.findUnique({
      where: { id: testId },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        createdBy: { select: { name: true } },
        printedBy: { select: { name: true } },
      },
    });

    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    const results = labTest.results as any;

    if (!labTest.isDirectTest) {
      return NextResponse.json(
        {
          success: false,
          error: "This is not a direct lab test",
        },
        { status: 400 },
      );
    }

    if (labTest.collectionStatus !== "collected") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot mark test as printed. Sample has not been collected yet.",
        },
        { status: 400 },
      );
    }

    if (!results || !results.parameters || results.parameters.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot mark test as printed. Results are missing.",
        },
        { status: 400 },
      );
    }

    if (labTest.printedAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Test has already been printed",
        },
        { status: 400 },
      );
    }

    const updatedTest = await prisma.labTest.update({
      where: { id: testId },
      data: {
        printedAt: new Date(),
        printedById: auth.userId!,
      },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        createdBy: { select: { name: true } },
        printedBy: { select: { name: true } },
      },
    });

    console.log(`[DEBUG] Print successful for test ${labTest.testId}`);

    return NextResponse.json({
      success: true,
      data: updatedTest,
      message: "Direct lab test marked as printed successfully",
    });
  } catch (error: any) {
    console.error("Error marking direct lab test as printed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to mark direct lab test as printed",
      },
      { status: 500 },
    );
  }
}