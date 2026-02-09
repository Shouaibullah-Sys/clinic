// app/api/radiology/records/[id]/print/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { RadiologyService } from "@/lib/models/RadiologyService";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// POST: Mark a radiology record as printed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Only radiology staff, radiologists, doctors, and admin can mark records as printed
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

    // Unwrap the params promise
    const { id: examId } = await params;

    // Find the radiology exam - try both collections
    let radiologyExam = await RadiologyExam.findById(examId);

    if (!radiologyExam) {
      // Try RadiologyService
      const serviceRecord = await RadiologyService.findById(examId);
      if (!serviceRecord) {
        return NextResponse.json(
          { success: false, error: "Radiology record not found" },
          { status: 404 },
        );
      }

      // For RadiologyService, handle print differently
      if (!serviceRecord.paymentVerified) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot print record. Payment has not been verified.",
          },
          { status: 400 },
        );
      }

      // RadiologyService uses reportStatus instead of finalized
      if (
        serviceRecord.reportStatus !== "completed" &&
        serviceRecord.reportStatus !== "reviewed" &&
        serviceRecord.reportStatus !== "approved"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot print record. Report has not been generated.",
          },
          { status: 400 },
        );
      }

      // Mark as printed for RadiologyService
      serviceRecord.reportGeneratedAt = new Date();
      serviceRecord.reportGeneratedBy = new mongoose.Types.ObjectId(
        auth.userId!,
      );
      await serviceRecord.save();

      // Populate and return
      const populatedService = await RadiologyService.findById(
        serviceRecord._id,
      )
        .populate("patient", "name patientId phone")
        .populate("radiologist", "name")
        .populate("reportGeneratedBy", "name")
        .lean();

      console.log(
        `Radiology service ${serviceRecord.serviceId} marked as printed by ${auth.userName}`,
      );

      return NextResponse.json({
        success: true,
        data: populatedService,
        message: "Radiology record marked as printed successfully",
      });
    }

    // Check if payment is verified
    if (!radiologyExam.paymentVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot print record. Payment has not been verified.",
        },
        { status: 400 },
      );
    }

    // Check if exam is finalized
    if (!radiologyExam.finalized) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot print record. Record has not been finalized.",
        },
        { status: 400 },
      );
    }

    // Check if exam is ready for print
    if (!radiologyExam.readyForPrint) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot print record. Record is not ready for print.",
        },
        { status: 400 },
      );
    }

    // Mark the record as printed (allow reprinting)
    radiologyExam.printedAt = new Date();
    radiologyExam.printedBy = new mongoose.Types.ObjectId(auth.userId!);

    await radiologyExam.save();

    // Populate the response
    const populatedExam = await RadiologyExam.findById(radiologyExam._id)
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .populate("finalizedBy", "name")
      .populate("printedBy", "name")
      .populate("results.reportedBy", "name")
      .populate("results.verifiedBy", "name")
      .lean();

    console.log(
      `Radiology record ${radiologyExam.examId} marked as printed by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: populatedExam,
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
