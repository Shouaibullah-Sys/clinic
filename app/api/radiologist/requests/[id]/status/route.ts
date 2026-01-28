// app/api/radiologist/requests/[id]/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyService } from "@/lib/models/RadiologyService";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";
import mongoose from "mongoose";

// PUT: Update radiology request status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Only radiologists and admins can update request status
    const allowedRoles = ["radiologist", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only radiologists can update request status." },
        { status: 403 }
      );
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const { status, notes } = body;

    console.log(`Updating radiology request ${requestId} status to ${status} by ${auth.userName}`);

    // Find the request
    const requestDoc = await RadiologyService.findById(requestId);
    
    if (!requestDoc) {
      return NextResponse.json(
        { success: false, error: "Radiology request not found" },
        { status: 404 }
      );
    }

    // Validate status transition
    const validStatuses = ["scheduled", "in-progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if status transition is valid
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

    // Check payment verification for routine tests before starting
    if (status === "in-progress" && requestDoc.priority === "routine" && requestDoc.billingStatus === "pending") {
      return NextResponse.json(
        { success: false, error: "Payment must be verified before starting the procedure" },
        { status: 400 }
      );
    }

    // Update the request
    requestDoc.status = status;
    
    // Assign radiologist if starting the procedure
    if (status === "in-progress" && !requestDoc.radiologist) {
      requestDoc.radiologist = new mongoose.Types.ObjectId(auth.userId);
    }

    // Set performed date when completed
    if (status === "completed") {
      requestDoc.performedDate = new Date();
    }

    // Add notes if provided
    if (notes) {
      requestDoc.notes = notes;
    }

    await requestDoc.save();

    // Populate for response
    const updatedRequest = await RadiologyService.findById(requestId)
      .populate("patient", "name patientId")
      .populate("referringDoctor", "name")
      .populate("radiologist", "name")
      .populate("technician", "name")
      .lean();

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
