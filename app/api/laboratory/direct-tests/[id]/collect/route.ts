import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

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
          error: "Forbidden. Only lab staff can collect samples.",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;
    const body = await request.json();

    const {
      sampleId,
      sampleCondition = "satisfactory",
      collectionNotes,
      sampleConditionNotes,
      specimen,
      results,
      testParameters,
    } = body;

    const test = await prisma.labTest.findUnique({
      where: { id: testId },
    });

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Direct lab test not found" },
        { status: 404 },
      );
    }

    if (!test.isDirectTest) {
      return NextResponse.json(
        { success: false, error: "This is not a direct lab test" },
        { status: 400 },
      );
    }

    if (test.collectionStatus === "collected") {
      return NextResponse.json(
        {
          success: false,
          error: "Sample has already been collected",
        },
        { status: 400 },
      );
    }

    const resolvedResults =
      (testParameters &&
        testParameters.length > 0 && {
          parameters: testParameters.map((p: any) => ({
            name: p.name,
            value: p.value,
            unit: p.unit || "",
            normalRange: p.normalRange || "",
            remarks: p.remarks || "",
          })),
        }) ||
      (results?.parameters &&
        results.parameters.length > 0 && {
          parameters: results.parameters.map((p: any) => ({
            name: p.name,
            value: p.value ?? p.result ?? "",
            unit: p.unit || "",
            normalRange: p.normalRange || "",
            remarks: p.remarks || "",
          })),
        }) ||
      (specimen?.parameters &&
        specimen.parameters.length > 0 && {
          parameters: specimen.parameters.map((p: any) => ({
            name: p.name,
            value: p.value ?? p.result ?? "",
            unit: p.unit || "",
            normalRange: p.normalRange || "",
            remarks: p.remarks || "",
          })),
        });

    const updateData: any = {
      collectionStatus: "collected",
      status: "completed",
      processingStatus: "completed",
      finalized: true,
      readyForPrint: !!resolvedResults,
      collectedAt: new Date(),
    };

    if (resolvedResults) {
      updateData.results = resolvedResults;
    }

    const updatedTest = await prisma.labTest.update({
      where: { id: testId },
      data: updateData,
      include: {
        patient: { select: { name: true, patientId: true } },
        doctor: { select: { name: true } },
      },
    });

    console.log("Direct test sample collected successfully!");

    return NextResponse.json({
      success: true,
      data: updatedTest,
      message: "Sample collected successfully",
    });
  } catch (error: any) {
    console.error("Error collecting sample for direct test:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to collect sample",
      },
      { status: 500 },
    );
  }
}