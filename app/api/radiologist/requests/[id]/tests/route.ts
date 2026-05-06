// app/api/radiologist/requests/[id]/tests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    if (!hasRequiredRole(auth.userRole, ["radiologist", "admin"])) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only radiologists can add tests and parameters." },
        { status: 403 }
      );
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const { tests, parameters, notes } = body;

    console.log(`Adding tests/parameters to radiology request ${requestId} by ${auth.userName}`);

    const requestDoc = await prisma.radiologyRequest.findUnique({
      where: { id: requestId },
    });
    
    if (!requestDoc) {
      return NextResponse.json(
        { success: false, error: "Radiology request not found" },
        { status: 404 }
      );
    }

    if (requestDoc.status !== "in-progress" && requestDoc.status !== "scheduled") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Cannot add tests/parameters. Request must be in scheduled or in-progress status.",
          currentStatus: requestDoc.status
        },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (tests && Array.isArray(tests) && tests.length > 0) {
      updateData.tests = tests.map((test: any) => ({
        name: test.name || "",
        description: test.description || "",
        performed: test.performed || false,
        performedAt: test.performedAt || null,
        notes: test.notes || ""
      }));
    }

    if (parameters && Array.isArray(parameters) && parameters.length > 0) {
      updateData.parameters = parameters.map((param: any) => ({
        name: param.name || "",
        value: param.value || "",
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        remarks: param.remarks || ""
      }));
    }

    if (notes) {
      updateData.notes = notes;
    }

    if (requestDoc.status === "scheduled") {
      updateData.status = "in-progress";
      if (!requestDoc.radiologistId) {
        updateData.radiologistId = auth.userId;
      }
    }

    const updatedRequest = await prisma.radiologyRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        patient: { select: { name: true, patientId: true } },
        referringDoctor: { select: { name: true } },
        radiologist: { select: { name: true } },
        technician: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: "Tests and parameters added successfully",
    });

  } catch (error: any) {
    console.error("Error adding tests/parameters to radiology request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add tests/parameters" },
      { status: 500 }
    );
  }
}