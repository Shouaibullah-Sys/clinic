// app/api/laboratory/templates/[id]/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTestTemplate } from "@/lib/models/LabTestTemplate";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";

// PUT: Toggle the active status of a lab test template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Only lab technicians, doctors, and admins can toggle template status
    const allowedRoles = ["lab_technician", "doctor", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to update lab test template status.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;

    // Check if template exists
    const existingTemplate = await LabTestTemplate.findById(id);
    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: "Lab test template not found" },
        { status: 404 },
      );
    }

    // Parse the request body to get the active status
    let newActiveStatus: boolean;
    try {
      const body = await request.json();
      // Use the provided active status, or toggle if not provided
      newActiveStatus =
        body.active !== undefined ? body.active : !existingTemplate.active;
    } catch {
      // If no body provided, toggle the status
      newActiveStatus = !existingTemplate.active;
    }

    // Update the active status
    const updatedTemplate = await LabTestTemplate.findByIdAndUpdate(
      id,
      { $set: { active: newActiveStatus } },
      { new: true, runValidators: true },
    ).populate("createdBy", "name email");

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: `Lab test template ${updatedTemplate?.active ? "activated" : "deactivated"} successfully`,
    });
  } catch (error: any) {
    console.error("Error toggling lab test template status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to toggle lab test template status",
      },
      { status: 500 },
    );
  }
}

// PATCH: Also support PATCH method for toggling status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return PUT(request, { params });
}
