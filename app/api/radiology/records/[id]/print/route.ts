// app/api/radiology/records/[id]/print/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const allowedRoles = [
      "radiology_technician",
      "radiologist",
      "doctor",
      "admin",
      "receptionist",
    ];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to print radiology records.",
        },
        { status: 403 },
      );
    }

    const { id: examId } = await params;

    let radiologyExam = await prisma.radiologyExam.findUnique({
      where: { id: examId },
    });

    if (!radiologyExam) {
      const serviceRecord = await prisma.radiologyRequest.findUnique({
        where: { id: examId },
      });

      if (!serviceRecord) {
        return NextResponse.json(
          { success: false, error: "Radiology record not found" },
          { status: 404 },
        );
      }

      if (!serviceRecord.paymentVerified) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot print record. Payment has not been verified.",
          },
          { status: 400 },
        );
      }

      const reportStatus = serviceRecord.reportStatus as string;
      if (
        reportStatus !== "completed" &&
        reportStatus !== "reviewed" &&
        reportStatus !== "approved"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot print record. Report has not been generated.",
          },
          { status: 400 },
        );
      }

      const updatedService = await prisma.radiologyRequest.update({
        where: { id: examId },
        data: {
          reportGeneratedAt: new Date(),
          reportGeneratedById: auth.userId!,
        },
        include: {
          patient: { select: { name: true, patientId: true, phone: true } },
          radiologist: { select: { name: true } },
          reportGeneratedBy: { select: { name: true } },
        },
      });

      console.log(
        `Radiology service ${serviceRecord.serviceId} marked as printed by ${auth.userName}`,
      );

      return NextResponse.json({
        success: true,
        data: updatedService,
        message: "Radiology record marked as printed successfully",
      });
    }

    if (!radiologyExam.paymentVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot print record. Payment has not been verified.",
        },
        { status: 400 },
      );
    }

    if (!radiologyExam.finalized) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot print record. Record has not been finalized.",
        },
        { status: 400 },
      );
    }

    if (!radiologyExam.readyForPrint) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot print record. Record is not ready for print.",
        },
        { status: 400 },
      );
    }

    const updatedExam = await prisma.radiologyExam.update({
      where: { id: examId },
      data: {
        printedAt: new Date(),
        printedById: auth.userId!,
      },
    });

    console.log(
      `Radiology record ${radiologyExam.examId} marked as printed by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: updatedExam,
      message: "Radiology record marked as printed successfully",
    });
  } catch (error: any) {
    console.error("Error marking radiology record as printed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to mark radiology record as printed",
      },
      { status: 500 },
    );
  }
}