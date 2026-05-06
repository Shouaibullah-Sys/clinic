// app/api/radiologist/requests/[id]/results/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    if (!hasRequiredRole(auth.userRole, ["radiologist", "admin"])) {
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

    const requestDoc = await prisma.radiologyRequest.findUnique({
      where: { id: requestId },
    });
    
    if (!requestDoc) {
      return NextResponse.json(
        { success: false, error: "Radiology request not found" },
        { status: 404 }
      );
    }

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

    if (requestDoc.reportStatus === "completed" && reportAction !== "amend") {
      return NextResponse.json(
        { success: false, error: "Report has already been completed" },
        { status: 400 }
      );
    }

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

    const previousVersion = (requestDoc.report as any)?.version || 1;

    const updateData: any = {
      findings: findings,
      impression: impression,
      recommendations: recommendations,
      reportStatus: reportStatus || "completed",
      status: status || "completed",
      reportGeneratedById: auth.userId,
      reportGeneratedAt: new Date(),
    };

    if (images && Array.isArray(images) && images.length > 0) {
      const newImages = images.map((img: any) => ({
        imageId: img.imageId || `IMG${Date.now()}`,
        imageUrl: img.imageUrl || "",
        view: img.view || "",
        description: img.description || "",
        takenAt: new Date(),
        takenById: auth.userId,
      }));
      updateData.images = [...(requestDoc.images || []), ...newImages];
    }

    updateData.report = {
      clinicalIndication: clinicalIndication ?? (requestDoc.report as any)?.clinicalIndication ?? "",
      technique: technique ?? (requestDoc.report as any)?.technique ?? "",
      comparison: comparison ?? (requestDoc.report as any)?.comparison ?? "",
      findings: findings,
      impression: impression,
      recommendations: recommendations ?? (requestDoc.report as any)?.recommendations ?? "",
      criticalFindings: typeof criticalFindings === "boolean" ? criticalFindings : (requestDoc.report as any)?.criticalFindings ?? false,
      criticalFindingsDetails: criticalFindingsDetails ?? (requestDoc.report as any)?.criticalFindingsDetails ?? "",
      criticalCommunication: {
        communicated: criticalCommunication?.communicated ?? (requestDoc.report as any)?.criticalCommunication?.communicated ?? false,
        communicatedTo: criticalCommunication?.communicatedTo ?? (requestDoc.report as any)?.criticalCommunication?.communicatedTo ?? "",
        communicatedAt: criticalCommunication?.communicatedAt ? new Date(criticalCommunication.communicatedAt) : (requestDoc.report as any)?.criticalCommunication?.communicatedAt,
        method: criticalCommunication?.method ?? (requestDoc.report as any)?.criticalCommunication?.method ?? "",
        notes: criticalCommunication?.notes ?? (requestDoc.report as any)?.criticalCommunication?.notes ?? "",
      },
      status: nextReportStatus,
      version: reportAction === "amend" ? previousVersion + 1 : previousVersion,
      amendmentReason: reportAction === "amend" ? amendmentReason || "Report amendment" : (requestDoc.report as any)?.amendmentReason || "",
      finalizedBy: reportAction === "finalize" ? auth.userId : (requestDoc.report as any)?.finalizedBy,
      finalizedAt: reportAction === "finalize" ? new Date() : (requestDoc.report as any)?.finalizedAt,
    };

    if (requestDoc.status === "scheduled") {
      updateData.status = "in-progress";
      if (!requestDoc.radiologistId) {
        updateData.radiologistId = auth.userId;
      }
    }

    if (!requestDoc.performedDate) {
      updateData.performedDate = new Date();
    }

    const updatedRequest = await prisma.radiologyRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        patient: { select: { name: true, patientId: true } },
        referringDoctor: { select: { name: true } },
        radiologist: { select: { name: true } },
        technician: { select: { name: true } },
        reportGeneratedBy: { select: { name: true } },
      },
    });

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