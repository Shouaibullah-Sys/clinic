// app/api/radiology/services/[id]/charges/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyService } from "@/lib/models/RadiologyService";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";
import mongoose from "mongoose";

// PUT: Update charges for radiology service
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

    // Check if user is receptionist, admin, or radiology staff
    const allowedRoles = ["receptionist", "admin", "radiologist", "technician"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. Only authorized staff can update charges.",
          userRole: auth.userRole,
          allowedRoles: allowedRoles
        },
        { status: 403 }
      );
    }
    
    const { id: serviceId } = await params;
    const userId = auth.userId;
    const body = await request.json();
    const {
      basePrice,
      tax = 0,
      discount = 0,
      otherCharges = 0,
      paidAmount,
      paymentMethod,
      transactionId,
      verifyPayment = false
    } = body;
    
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
        { success: false, error: "Cannot update charges for cancelled service" },
        { status: 400 }
      );
    }
    
    // Initialize charges if not exists
    if (!radiologyService.charges) {
      radiologyService.charges = {
        basePrice: 0,
        tax: 0,
        discount: 0,
        otherCharges: 0,
        totalAmount: 0,
        paid: 0,
        due: 0,
        paymentStatus: "pending",
      };
      await radiologyService.save();
    }
    
    // Calculate total amount
    const currentBasePrice = basePrice !== undefined ? basePrice : radiologyService.charges.basePrice;
    const totalAmount = currentBasePrice + tax + otherCharges - discount;
    
    // Calculate current paid amount
    const currentPaid = radiologyService.charges.paid || 0;
    const newPaid = paidAmount !== undefined ? paidAmount : currentPaid;
    const due = Math.max(0, totalAmount - newPaid);
    
    // Determine payment status
    let paymentStatus: "pending" | "partial" | "paid" | "cancelled" = "pending";
    if (due === 0 && totalAmount > 0) {
      paymentStatus = "paid";
    } else if (newPaid > 0) {
      paymentStatus = "partial";
    }
    
    // Update charges
    const updateData: any = {
      "charges.basePrice": currentBasePrice,
      "charges.tax": tax,
      "charges.discount": discount,
      "charges.otherCharges": otherCharges,
      "charges.totalAmount": totalAmount,
      "charges.paid": newPaid,
      "charges.due": due,
      "charges.paymentStatus": paymentStatus,
    };
    
    // Add payment method and transaction ID if provided
    if (paymentMethod) {
      updateData["charges.paymentMethod"] = paymentMethod;
    }
    if (transactionId) {
      updateData["charges.transactionId"] = transactionId;
    }
    
    // Set payment date if payment is being made
    if (paidAmount > 0 && paidAmount > currentPaid) {
      updateData["charges.paymentDate"] = new Date();
      updateData["charges.collectedBy"] = userId;
    }
    
    // Verify payment if requested and fully paid
    if (verifyPayment && paymentStatus === "paid") {
      updateData.paymentVerified = true;
      updateData.paymentVerifiedBy = userId;
      updateData.paymentVerifiedAt = new Date();
      updateData.billingStatus = "paid";
    }
    
    // Update radiology service using findById and save() to trigger pre-save hook
    await RadiologyService.findByIdAndUpdate(
      serviceId,
      { $set: updateData },
      { new: true }
    );
    
    // Force trigger pre-save hook by fetching and saving the document
    const serviceDoc = await RadiologyService.findById(serviceId);
    if (serviceDoc) {
      await serviceDoc.save();
    }
    
    // Fetch the updated service again for response
    let updatedService = await RadiologyService.findById(serviceId)
      .populate("patient", "name patientId phone")
      .populate("referringDoctor", "name specialization")
      .populate("charges.collectedBy", "name")
      .populate({ path: "paymentVerifiedBy", select: "name", strictPopulate: false })
      .populate("radiologist", "name")
      .populate("technician", "name");
    
    return NextResponse.json({
      success: true,
      data: updatedService,
      message: "Charges updated successfully",
    });
    
  } catch (error: any) {
    console.error("Error updating radiology service charges:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update charges" },
      { status: 500 }
    );
  }
}

// GET: Get charges for radiology service
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
    
    const { id: serviceId } = await params;
    
    // Find radiology service
    const radiologyService = await RadiologyService.findById(serviceId)
      .populate("patient", "name patientId phone")
      .populate("referringDoctor", "name specialization")
      .populate("charges.collectedBy", "name")
      .populate("paymentVerifiedBy", "name");
    
    if (!radiologyService) {
      return NextResponse.json(
        { success: false, error: "Radiology service not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: radiologyService,
    });
    
  } catch (error: any) {
    console.error("Error fetching radiology service charges:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch charges" },
      { status: 500 }
    );
  }
}
