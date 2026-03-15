// app/api/laboratory/templates/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTestTemplate } from "@/lib/models/LabTestTemplate";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";

// GET: Fetch a single lab test template by ID
export async function GET(
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

    const { id } = await params;

    const template = await LabTestTemplate.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Lab test template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error("Error fetching lab test template:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch lab test template",
      },
      { status: 500 },
    );
  }
}

// PUT: Update a lab test template
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

    // Only lab technicians, doctors, and admins can update templates
    const allowedRoles = ["lab_technician", "doctor", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to update lab test templates.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if template exists
    const existingTemplate = await LabTestTemplate.findById(id);
    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: "Lab test template not found" },
        { status: 404 },
      );
    }

    // If updating test code, check for duplicates
    if (body.testCode && body.testCode !== existingTemplate.testCode) {
      const duplicateTemplate = await LabTestTemplate.findOne({
        testCode: body.testCode.toUpperCase(),
        _id: { $ne: id },
      });
      if (duplicateTemplate) {
        return NextResponse.json(
          { success: false, error: "Test code already exists" },
          { status: 409 },
        );
      }
    }

    // Update the template
    const updateData: any = {};
    if (body.testCode !== undefined)
      updateData.testCode = body.testCode.toUpperCase();
    if (body.testName !== undefined) updateData.testName = body.testName;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.specimenType !== undefined)
      updateData.specimenType = body.specimenType;
    if (body.containerType !== undefined)
      updateData.containerType = body.containerType;
    if (body.sampleVolume !== undefined)
      updateData.sampleVolume = body.sampleVolume;
    if (body.fastingRequired !== undefined)
      updateData.fastingRequired = body.fastingRequired;
    if (body.preparationInstructions !== undefined)
      updateData.preparationInstructions = body.preparationInstructions;
    if (body.turnaroundTime !== undefined)
      updateData.turnaroundTime = body.turnaroundTime;
    if (body.basePrice !== undefined) updateData.basePrice = body.basePrice;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.parameters !== undefined) updateData.parameters = body.parameters;

    const updatedTemplate = await LabTestTemplate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).populate("createdBy", "name email");

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: "Lab test template updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating lab test template:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 },
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Duplicate test code detected" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update lab test template",
      },
      { status: 500 },
    );
  }
}

// DELETE: Delete a lab test template
export async function DELETE(
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

    // Only admins and lab technicians can delete templates
    const allowedRoles = ["admin", "lab_technician"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only admins and lab technicians can delete lab test templates.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;

    const template = await LabTestTemplate.findById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: "Lab test template not found" },
        { status: 404 },
      );
    }

    await LabTestTemplate.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Lab test template deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting lab test template:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete lab test template",
      },
      { status: 500 },
    );
  }
}
