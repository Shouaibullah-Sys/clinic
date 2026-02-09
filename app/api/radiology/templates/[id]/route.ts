// app/api/radiology/templates/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyTemplate } from "@/lib/models/RadiologyTemplate";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";

// GET: Fetch a single radiology template by ID
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

    const template = await RadiologyTemplate.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Radiology template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error("Error fetching radiology template:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch radiology template",
      },
      { status: 500 },
    );
  }
}

// PUT: Update a radiology template
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

    // Only radiologists, doctors, and admins can update templates
    const allowedRoles = ["radiologist", "doctor", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to update radiology templates.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if template exists
    const existingTemplate = await RadiologyTemplate.findById(id);
    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: "Radiology template not found" },
        { status: 404 },
      );
    }

    // If updating template code, check for duplicates
    if (
      body.templateCode &&
      body.templateCode !== existingTemplate.templateCode
    ) {
      const duplicateTemplate = await RadiologyTemplate.findOne({
        templateCode: body.templateCode.toUpperCase(),
        _id: { $ne: id },
      });
      if (duplicateTemplate) {
        return NextResponse.json(
          { success: false, error: "Template code already exists" },
          { status: 409 },
        );
      }
    }

    // Update the template
    const updateData: any = {};
    if (body.templateCode !== undefined)
      updateData.templateCode = body.templateCode.toUpperCase();
    if (body.examName !== undefined) updateData.examName = body.examName;
    if (body.serviceType !== undefined)
      updateData.serviceType = body.serviceType;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.bodyPart !== undefined) updateData.bodyPart = body.bodyPart;
    if (body.views !== undefined) updateData.views = body.views;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.contrastRequired !== undefined)
      updateData.contrastRequired = body.contrastRequired;
    if (body.contrastType !== undefined)
      updateData.contrastType = body.contrastType;
    if (body.preparationInstructions !== undefined)
      updateData.preparationInstructions = body.preparationInstructions;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.basePrice !== undefined) updateData.basePrice = body.basePrice;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.parameters !== undefined) updateData.parameters = body.parameters;

    const updatedTemplate = await RadiologyTemplate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).populate("createdBy", "name email");

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: "Radiology template updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating radiology template:", error);

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
        { success: false, error: "Duplicate template code detected" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update radiology template",
      },
      { status: 500 },
    );
  }
}

// DELETE: Delete a radiology template
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

    // Only admins can delete templates
    if (auth.userRole !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only admins can delete radiology templates.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;

    const template = await RadiologyTemplate.findById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: "Radiology template not found" },
        { status: 404 },
      );
    }

    await RadiologyTemplate.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Radiology template deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting radiology template:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete radiology template",
      },
      { status: 500 },
    );
  }
}
