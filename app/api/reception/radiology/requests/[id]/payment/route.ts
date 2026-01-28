// app/api/reception/radiology/requests/[id]/payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyService } from "@/lib/models/RadiologyService";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";

// PUT: Update payment status for radiology request
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Check if user is a receptionist or admin
    const allowedRoles = ["receptionist", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. Only receptionists and admins can update payment status.",
          userRole: auth.userRole,
          allowedRoles: allowedRoles
        },
        { status: 403 }
      );
    }
    
    const { id: requestId } = await params;
    const body = await request.json();
    const { billingStatus, paymentMethod, transactionId, notes } = body;
    
    // Validate billing status
    const validBillingStatuses = ["pending", "billed", "paid"];
    if (!billingStatus || !validBillingStatuses.includes(billingStatus)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid billing status. Must be one of: ${validBillingStatuses.join(", ")}` 
        },
        { status: 400 }
      );
    }
    
    // Find radiology request
    const radiologyRequest = await RadiologyService.findById(requestId);
    
    if (!radiologyRequest) {
      return NextResponse.json(
        { success: false, error: "Radiology request not found" },
        { status: 404 }
      );
    }
    
    // Check if request is cancelled
    if (radiologyRequest.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot update payment for cancelled request" },
        { status: 400 }
      );
    }
    
    // Validate payment status transitions
    const currentStatus = radiologyRequest.billingStatus;
    const validTransitions: Record<string, string[]> = {
      "pending": ["billed", "paid"],
      "billed": ["paid", "pending"],
      "paid": ["billed", "pending"]
    };
    
    if (!validTransitions[currentStatus]?.includes(billingStatus)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid payment status transition from ${currentStatus} to ${billingStatus}` 
        },
        { status: 400 }
      );
    }
    
    // Update payment status
    const updateData: any = {
      billingStatus,
      updatedAt: new Date()
    };
    
    // Add payment details if provided
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }
    
    if (transactionId) {
      updateData.transactionId = transactionId;
    }
    
    if (notes) {
      updateData.paymentNotes = notes;
    }
    
    // Add payment processed by info
    if (billingStatus === "paid") {
      updateData.paymentProcessedBy = auth.userId;
      updateData.paymentProcessedAt = new Date();
    }
    
    const updatedRequest = await RadiologyService.findByIdAndUpdate(
      requestId,
      { $set: updateData },
      { new: true }
    )
      .populate("patient", "name patientId phone")
      .populate("referringDoctor", "name specialization")
      .populate("radiologist", "name")
      .populate("technician", "name");
    
    console.log(`Payment status updated for request ${requestId}: ${currentStatus} -> ${billingStatus} by ${auth.userName}`);
    
    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: `Payment status updated to ${billingStatus}`,
    });
    
  } catch (error: any) {
    console.error("Error updating payment status:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to update payment status",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET: Get billing details for a radiology request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Check if user is a receptionist or admin
    const allowedRoles = ["receptionist", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. You don't have permission to view billing details.",
          userRole: auth.userRole,
          allowedRoles: allowedRoles
        },
        { status: 403 }
      );
    }
    
    const { id: requestId } = await params;
    
    // Find radiology request with all details
    const radiologyRequest = await RadiologyService.findById(requestId)
      .populate("patient", "name patientId phone email dateOfBirth gender")
      .populate("referringDoctor", "name specialization department")
      .populate("radiologist", "name")
      .populate("technician", "name")
      .populate("department", "name")
      .lean();
    
    if (!radiologyRequest) {
      return NextResponse.json(
        { success: false, error: "Radiology request not found" },
        { status: 404 }
      );
    }
    
    // Get pricing information based on service type
    const pricingInfo = getServicePricing(radiologyRequest.serviceType);
    
    return NextResponse.json({
      success: true,
      data: {
        ...radiologyRequest,
        pricing: pricingInfo
      }
    });
    
  } catch (error: any) {
    console.error("Error fetching billing details:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch billing details",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to get service pricing
function getServicePricing(serviceType: string) {
  const pricingMap: Record<string, { basePrice: number; contrastPrice: number }> = {
    "x-ray": { basePrice: 500, contrastPrice: 0 },
    "ct-scan": { basePrice: 2500, contrastPrice: 500 },
    "mri": { basePrice: 5000, contrastPrice: 1000 },
    "ultrasound": { basePrice: 1000, contrastPrice: 0 }
  };
  
  return pricingMap[serviceType] || { basePrice: 1000, contrastPrice: 0 };
}
