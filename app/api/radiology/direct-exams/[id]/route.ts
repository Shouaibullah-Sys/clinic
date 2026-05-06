// app/api/radiology/direct-exams/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

// GET: Get a single direct radiology exam by ID
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

    const allowedRoles = [
      "radiology_technician",
      "radiologist",
      "admin",
      "receptionist",
      "doctor",
    ];
    if (!allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to access direct radiology exams.",
        },
        { status: 403 },
      );
    }

    const { id: examId } = await params;

    const radiologyExam = await prisma.radiologyExam.findUnique({
      where: { id: examId },
    });

    if (!radiologyExam) {
      return NextResponse.json(
        { success: false, error: "Radiology exam not found" },
        { status: 404 },
      );
    }

    // Verify this is a direct exam
    if (!radiologyExam.isDirectExam) {
      return NextResponse.json(
        { success: false, error: "This is not a direct radiology exam" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: radiologyExam,
    });
  } catch (error: any) {
    console.error("Error fetching direct radiology exam:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch direct radiology exam",
      },
      { status: 500 },
    );
  }
}

// PUT: Update exam details
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

    const allowedRoles = ["radiology_technician", "admin", "receptionist"];
    if (!allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to update radiology exams.",
        },
        { status: 403 },
      );
    }

    const { id: examId } = await params;
    const body = await request.json();

    const radiologyExam = await prisma.radiologyExam.findUnique({
      where: { id: examId },
    });

    if (!radiologyExam) {
      return NextResponse.json(
        { success: false, error: "Radiology exam not found" },
        { status: 404 },
      );
    }

    if (!radiologyExam.isDirectExam) {
      return NextResponse.json(
        { success: false, error: "This is not a direct radiology exam" },
        { status: 400 },
      );
    }

    if (radiologyExam.finalized) {
      return NextResponse.json(
        { success: false, error: "Cannot update a finalized exam" },
        { status: 400 },
      );
    }

    // Update allowed fields
    const updateData: any = {};
    if (body.examName) updateData.examName = body.examName;
    if (body.description) updateData.modality = body.description;
    if (body.price !== undefined) updateData.totalAmount = body.price;
    if (body.category) updateData.category = body.category;
    if (body.notes !== undefined) updateData.clinicalNotes = body.notes;

    const updatedExam = await prisma.radiologyExam.update({
      where: { id: examId },
      data: updateData,
    });

    console.log(`Direct radiology exam ${radiologyExam.examId} updated`);

    return NextResponse.json({
      success: true,
      data: updatedExam,
      message: "Direct radiology exam updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating direct radiology exam:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update direct radiology exam",
      },
      { status: 500 },
    );
  }
}