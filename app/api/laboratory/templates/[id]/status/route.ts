// app/api/laboratory/templates/[id]/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";
import { hasRequiredRole } from "@/lib/auth";

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
            "Forbidden. You don't have permission to update lab test template status.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;

    const existingTemplate = await prisma.labTestTemplate.findUnique({
      where: { id },
    });
    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: "Lab test template not found" },
        { status: 404 },
      );
    }

    let newActiveStatus: boolean;
    try {
      const body = await request.json();
      newActiveStatus = body.active !== undefined ? body.active : !existingTemplate.active;
    } catch {
      newActiveStatus = !existingTemplate.active;
    }

    const updatedTemplate = await prisma.labTestTemplate.update({
      where: { id },
      data: { active: newActiveStatus },
    });

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: `Lab test template ${updatedTemplate.active ? "activated" : "deactivated"} successfully`,
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return PUT(request, { params });
}