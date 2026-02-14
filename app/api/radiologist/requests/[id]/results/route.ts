// app/api/radiologist/requests/[id]/results/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyService } from "@/lib/models/RadiologyService";
import "@/lib/models/Patient";
import "@/lib/models/User";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";
import mongoose from "mongoose";

// PUT: Submit radiology results (findings, impression, recommendations)
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

    // Only radiologists and admins can submit results
    const allowedRoles = ["radiologist", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only radiologists can submit results." },
        { status: 403 }
      );
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const {
      findings,
      impression,
      recommendations,
      status,
      reportStatus,
      images,
      clinicalIndication,
      technique,
      comparison,
      criticalFindings,
      criticalFindingsDetails,
      criticalCommunication,
      reportAction,
      amendmentReason,
    } = body;

    console.log(`Submitting results for radiology request ${requestId} by ${auth.userName}`);

    // Find the request
    const requestDoc = await RadiologyService.findById(requestId);
    
    if (!requestDoc) {
      return NextResponse.json(
        { success: false, error: "Radiology request not found" },
        { status: 404 }
      );
    }

    // Check if request is in progress
    if (requestDoc.status !== "in-progress" && requestDoc.status !== "scheduled") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Cannot submit results. Request must be in scheduled or in-progress status.",
          currentStatus: requestDoc.status
        },
        { status: 400 }
      );
    }

    // Check if report is already completed
    if (requestDoc.reportStatus === "completed" && reportAction !== "amend") {
      return NextResponse.json(
        { success: false, error: "Report has already been completed" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!findings || !impression) {
      return NextResponse.json(
        { success: false, error: "Findings and impression are required" },
        { status: 400 }
      );
    }

    const nextReportStatus =
      reportAction === "amend"
        ? "amended"
        : reportAction === "finalize"
          ? "final"
          : "draft";

    // Update legacy fields for backward compatibility
    requestDoc.findings = findings;
    requestDoc.impression = impression;
    
    if (recommendations) {
      requestDoc.recommendations = recommendations;
    }

    // Add images if provided
    if (images && Array.isArray(images) && images.length > 0) {
      const newImages = images.map((img: any) => ({
        imageId: img.imageId || `IMG${Date.now()}`,
        imageUrl: img.imageUrl || "",
        view: img.view || "",
        description: img.description || "",
        takenAt: new Date(),
        takenBy: new mongoose.Types.ObjectId(auth.userId)
      }));
      
      requestDoc.images = [...(requestDoc.images || []), ...newImages];
    }

    // Update report status
    if (reportStatus) {
      requestDoc.reportStatus = reportStatus;
    } else {
      requestDoc.reportStatus = "completed";
    }

    // Update status if provided
    if (status) {
      requestDoc.status = status;
    } else {
      requestDoc.status = "completed";
    }

    const previousVersion = requestDoc.report?.version || 1;
    requestDoc.report = {
      clinicalIndication:
        clinicalIndication ??
        requestDoc.report?.clinicalIndication ??
        "",
      technique: technique ?? requestDoc.report?.technique ?? "",
      comparison: comparison ?? requestDoc.report?.comparison ?? "",
      findings: findings ?? requestDoc.report?.findings ?? "",
      impression: impression ?? requestDoc.report?.impression ?? "",
      recommendations:
        recommendations ??
        requestDoc.report?.recommendations ??
        "",
      criticalFindings:
        typeof criticalFindings === "boolean"
          ? criticalFindings
          : (requestDoc.report?.criticalFindings ?? false),
      criticalFindingsDetails:
        criticalFindingsDetails ??
        requestDoc.report?.criticalFindingsDetails ??
        "",
      criticalCommunication: {
        communicated:
          criticalCommunication?.communicated ??
          requestDoc.report?.criticalCommunication?.communicated ??
          false,
        communicatedTo:
          criticalCommunication?.communicatedTo ??
          requestDoc.report?.criticalCommunication?.communicatedTo ??
          "",
        communicatedAt:
          criticalCommunication?.communicatedAt
            ? new Date(criticalCommunication.communicatedAt)
            : requestDoc.report?.criticalCommunication?.communicatedAt,
        method:
          criticalCommunication?.method ??
          requestDoc.report?.criticalCommunication?.method ??
          "",
        notes:
          criticalCommunication?.notes ??
          requestDoc.report?.criticalCommunication?.notes ??
          "",
      },
      status: nextReportStatus as "draft" | "final" | "amended",
      version: reportAction === "amend" ? previousVersion + 1 : previousVersion,
      amendmentReason:
        reportAction === "amend"
          ? amendmentReason || "Report amendment"
          : requestDoc.report?.amendmentReason || "",
      finalizedBy:
        reportAction === "finalize"
          ? new mongoose.Types.ObjectId(auth.userId)
          : requestDoc.report?.finalizedBy,
      finalizedAt:
        reportAction === "finalize"
          ? new Date()
          : requestDoc.report?.finalizedAt,
    };

    // Set report generation details
    requestDoc.reportGeneratedBy = new mongoose.Types.ObjectId(auth.userId);
    requestDoc.reportGeneratedAt = new Date();

    // Set performed date if not already set
    if (!requestDoc.performedDate) {
      requestDoc.performedDate = new Date();
    }

    // Assign radiologist if not already assigned
    if (!requestDoc.radiologist) {
      requestDoc.radiologist = new mongoose.Types.ObjectId(auth.userId);
    }

    await requestDoc.save();

    // Populate for response
    const updatedRequest = await RadiologyService.findById(requestId)
      .populate("patient", "name patientId")
      .populate("referringDoctor", "name")
      .populate("radiologist", "name")
      .populate("technician", "name")
      .populate("reportGeneratedBy", "name")
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: "Results submitted successfully",
    });

  } catch (error: any) {
    console.error("Error submitting radiology results:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit results" },
      { status: 500 }
    );
  }
}
