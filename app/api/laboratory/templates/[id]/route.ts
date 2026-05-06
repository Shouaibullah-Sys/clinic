import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";
import { transformLabTestTemplateForAPI, transformLabTestTemplateForDB } from "@/lib/prisma";

const hasRequiredRole = (userRole: string | undefined, allowedRoles: string[]) => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

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

    const template = await prisma.labTestTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Lab test template not found" },
        { status: 404 },
      );
    }

    // Transform to frontend-compatible format
    const transformedTemplate = transformLabTestTemplateForAPI(template);

    return NextResponse.json({
      success: true,
      data: transformedTemplate,
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

    const allowedRoles = ["lab_technician", "doctor", "admin"];
    if (!hasRequiredRole(payload.role, allowedRoles)) {
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

    const existingTemplate = await prisma.labTestTemplate.findUnique({
      where: { id },
    });
    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: "Lab test template not found" },
        { status: 404 },
      );
    }

    let testCode = body.testCode;
    if (body.testCode && body.testCode !== existingTemplate.testType) {
      const duplicateTemplate = await prisma.labTestTemplate.findFirst({
        where: {
          testType: body.testCode,
          NOT: { id },
        },
      });
      if (duplicateTemplate) {
        return NextResponse.json(
          { success: false, error: "Test code already exists" },
          { status: 409 },
        );
      }
    }

    // Transform to DB format for update (exclude testCode/testType - not editable)
    const updateData = transformLabTestTemplateForDB({
      testName: body.testName,
      category: body.category,
      description: body.description,
      preparationInstructions: body.preparationInstructions,
      parameters: body.parameters,
      specimenType: body.specimenType,
      containerType: body.containerType,
      sampleVolume: body.sampleVolume,
      fastingRequired: body.fastingRequired,
      turnaroundTime: body.turnaroundTime,
      active: body.active,
      basePrice: body.basePrice,
    });

    const updatedTemplate = await prisma.labTestTemplate.update({
      where: { id },
      data: updateData,
    });

    // Transform back to frontend format
    const transformedTemplate = transformLabTestTemplateForAPI(updatedTemplate);

    return NextResponse.json({
      success: true,
      data: transformedTemplate,
      message: "Lab test template updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating lab test template:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update lab test template",
      },
      { status: 500 },
    );
  }
}

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

    const allowedRoles = ["admin", "lab_technician"];
    if (!hasRequiredRole(payload.role, allowedRoles)) {
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

    const template = await prisma.labTestTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      return NextResponse.json(
        { success: false, error: "Lab test template not found" },
        { status: 404 },
      );
    }

    await prisma.labTestTemplate.delete({
      where: { id },
    });

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