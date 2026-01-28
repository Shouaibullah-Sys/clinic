// app/api/radiology/services/[id]/verify-payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyService } from "@/lib/models/RadiologyService";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";

// PUT: Verify payment for radiology service
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // Authenticate request using centralized auth
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Check if user is receptionist, radiology staff, or admin
    const allowedRoles = ["receptionist", "radiologist", "technician", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. Only authorized staff can verify payments.",
          userRole: auth.userRole,
          allowedRoles: allowedRoles
        },
        { status: 403 }
      );
    }
    
    const { id: serviceId } = await params;
    const userId = auth.userId;
    const body = await request.json();
    const { verify = true, notes } = body;
    
    // Ensure userId is defined
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID not found in authentication token" },
        { status: 401 }
      );
    }
    
    // Find radiology service
    const radiologyService = await RadiologyService.findById(serviceId);
    
    if (!radiologyService) {
      return NextResponse.json(
        { success: false, error: "Radiology service not found" },
        { status: 404 }
      );
    }
    
    // Check if service is cancelled
    if (radiologyService.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot verify payment for cancelled service" },
        { status: 400 }
      );
    }
    
    // Check if payment is already verified
    if (radiologyService.paymentVerified && verify) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Payment is already verified",
          alreadyVerified: true 
        },
        { status: 400 }
      );
    }
    
    let updatedService;
    let message;
    
    if (verify) {
      // Verify payment
      updatedService = await RadiologyService.verifyPayment(serviceId, userId, notes);
      message = "Payment verified successfully";
    } else {
      // Unverify payment
      updatedService = await RadiologyService.unverifyPayment(serviceId);
      message = "Payment verification removed";
    }
    
    // Check if update was successful
    if (!updatedService) {
      return NextResponse.json(
        { success: false, error: "Failed to update radiology service" },
        { status: 500 }
      );
    }
    
    // Populate response
    await updatedService.populate([
      { path: "patient", select: "name patientId phone" },
      { path: "referringDoctor", select: "name specialization" },
      { path: "paymentVerifiedBy", select: "name role" },
    ]);
    
    return NextResponse.json({
      success: true,
      data: updatedService,
      message,
    });
    
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
