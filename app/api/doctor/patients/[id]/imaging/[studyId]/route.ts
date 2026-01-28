import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyService } from "@/lib/models/RadiologyService";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";
import mongoose from "mongoose";

// GET: Get a specific imaging study with results for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studyId: string }> }
) {
  try {
    const { id: patientId, studyId } = await params;
    
    await dbConnect();
    
    // Authenticate request using centralized auth
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Check if user is a doctor or admin
    const allowedRoles = ["doctor", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. Doctor access required.",
          userRole: auth.userRole,
          allowedRoles: allowedRoles
        },
        { status: 403 }
      );
    }
    
    const userId = auth.userId;
    console.log(`Fetching imaging study ${studyId} for patient ${patientId} by doctor ${userId}`);
    
    const doctorId = new mongoose.Types.ObjectId(userId);
    
    // Get the imaging study with full details including results
    const imagingStudy = await RadiologyService.findOne({
      _id: studyId,
      patient: patientId,
      referringDoctor: doctorId,
    })
      .populate("patient", "name patientId phone email dateOfBirth gender")
      .populate("referringDoctor", "name specialization department licenseNumber")
      .populate("radiologist", "name")
      .populate("technician", "name")
      .populate("appointment", "appointmentId date")
      .populate("reportGeneratedBy", "name")
      .populate("reviewedBy", "name")
      .populate("approvedBy", "name")
      .lean();
    
    if (!imagingStudy) {
      return NextResponse.json(
        { success: false, error: "Imaging study not found or you don't have permission to access it" },
        { status: 404 }
      );
    }
    
    console.log(`Found imaging study for patient ${patientId}`);
    
    return NextResponse.json({
      success: true,
      data: imagingStudy,
    });
    
  } catch (error: any) {
    console.error("Error fetching imaging study:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch imaging study" },
      { status: 500 }
    );
  }
}
