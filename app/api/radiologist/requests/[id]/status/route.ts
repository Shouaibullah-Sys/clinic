// app/api/radiologist/requests/[id]/status/route.ts

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
        { success: false, error: "Forbidden. Only radiologists can update request status." },
        { status: 403 }
      );
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const { status, notes } = body;

    console.log(`Updating radiology request ${requestId} status to ${status} by ${auth.userName}`);

    const requestDoc = await prisma.radiologyRequest.findUnique({
      where: { id: requestId },
    });
    
    if (!requestDoc) {
      return NextResponse.json(
        { success: false, error: "Radiology request not found" },
        { status: 404 }
      );
    }

    const validStatuses = ["scheduled", "in-progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const currentStatus = requestDoc.status;
    const validTransitions: Record<string, string[]> = {
      "scheduled": ["in-progress", "cancelled"],
      "in-progress": ["completed", "cancelled"],
      "completed": [],
      "cancelled": []
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot transition from ${currentStatus} to ${status}`,
          currentStatus,
          requestedStatus: status,
          allowedTransitions: validTransitions[currentStatus]
        },
        { status: 400 }
      );
    }

    if (status === "in-progress" && requestDoc.priority === "routine" && requestDoc.billingStatus === "pending") {
      return NextResponse.json(
        { success: false, error: "Payment must be verified before starting the procedure" },
        { status: 400 }
      );
    }

    const updateData: any = {
      status: status,
    };

    if (status === "in-progress" && !requestDoc.radiologistId) {
      updateData.radiologistId = auth.userId;
    }

    if (status === "completed") {
      updateData.performedDate = new Date();
    }

    if (notes) {
      updateData.notes = notes;
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
      message: `Request status updated to ${status}`,
    });

  } catch (error: any) {
    console.error("Error updating radiology request status:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update request status" },
      { status: 500 }
    );
  }
}