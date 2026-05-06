// app/api/radiology/templates/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

// GET: Fetch a single radiology template by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    const template = await prisma.radiologyTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

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
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only radiologists, doctors, and admins can update templates
    const allowedRoles = ["radiologist", "doctor", "admin"];
    if (!allowedRoles.includes(payload.role)) {
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
    const existingTemplate = await prisma.radiologyTemplate.findUnique({
      where: { id },
    });
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
      const duplicateTemplate = await prisma.radiologyTemplate.findFirst({
        where: {
          templateCode: body.templateCode.toUpperCase(),
          id: { not: id },
        },
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
    if (body.views !== undefined) updateData.views = JSON.stringify(body.views);
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
    if (body.parameters !== undefined) updateData.parameters = JSON.stringify(body.parameters);
    if (body.clinicalIndicationTemplate !== undefined)
      updateData.clinicalIndicationTemplate = body.clinicalIndicationTemplate;
    if (body.techniqueTemplate !== undefined)
      updateData.techniqueTemplate = body.techniqueTemplate;
    if (body.comparisonTemplate !== undefined)
      updateData.comparisonTemplate = body.comparisonTemplate;
    if (body.findingsTemplate !== undefined)
      updateData.findingsTemplate = body.findingsTemplate;
    if (body.impressionTemplate !== undefined)
      updateData.impressionTemplate = body.impressionTemplate;
    if (body.recommendationTemplate !== undefined)
      updateData.recommendationTemplate = body.recommendationTemplate;
    if (body.criticalFindingsChecklist !== undefined)
      updateData.criticalFindingsChecklist = JSON.stringify(body.criticalFindingsChecklist);

    const updatedTemplate = await prisma.radiologyTemplate.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: "Radiology template updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating radiology template:", error);
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
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only admins can delete templates
    if (payload.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only admins can delete radiology templates.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;

    const template = await prisma.radiologyTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      return NextResponse.json(
        { success: false, error: "Radiology template not found" },
        { status: 404 },
      );
    }

    await prisma.radiologyTemplate.delete({
      where: { id },
    });

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