// app/api/radiologist/requests/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyService } from "@/lib/models/RadiologyService";
import "@/lib/models/Patient";
import "@/lib/models/User";
import "@/lib/models/RadiologyTemplate";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";

// GET: Get a single radiology request by ID
export async function GET(
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

    // Check if user can access radiology requests
    const allowedRoles = ["radiologist", "admin", "doctor"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access radiology requests." },
        { status: 403 }
      );
    }

    const { id: requestId } = await params;

    console.log(`Radiology request requested by ${auth.userRole} ${auth.userName}: ${requestId}`);

    // Find the request by ID
    const requestDoc = await RadiologyService.findById(requestId)
      .populate("patient", "name patientId phone email dateOfBirth gender")
      .populate("referringDoctor", "name specialization department licenseNumber")
      .populate("radiologist", "name")
      .populate("technician", "name")
      .populate("appointment", "appointmentId date")
      .populate("templateId", "templateCode examName findingsTemplate impressionTemplate recommendationTemplate clinicalIndicationTemplate techniqueTemplate comparisonTemplate criticalFindingsChecklist")
      .populate("reportGeneratedBy", "name")
      .populate("reviewedBy", "name")
      .populate("approvedBy", "name")
      .lean();

    if (!requestDoc) {
      return NextResponse.json(
        { success: false, error: "Radiology request not found" },
        { status: 404 }
      );
    }

    // If user is doctor, check if they can access this request
    if (auth.userRole === "doctor" && requestDoc.referringDoctor.toString() !== auth.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You can only access your own radiology requests." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: requestDoc,
      userRole: auth.userRole
    });

  } catch (error: any) {
    console.error("Error fetching radiology request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch radiology request" },
      { status: 500 }
    );
  }
}
