// app/api/laboratory/tests/[id]/verify-payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { jwtVerify } from "jose";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// PUT: Verify payment for lab test
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    
    const userId = payload.id as string;
    const userRole = payload.role as string;
    
    // Only receptionist, laboratory staff, and admin can verify payments
    if (!["receptionist", "lab_technician", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only authorized staff can verify payments." },
        { status: 403 }
      );
    }
    
    const { id: testId } = await params;
    const body = await request.json();
    const { verify = true, notes } = body;
    
    // Find lab test
    const labTest = await LabTest.findById(testId);
    
    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }
    
    // Check if test is cancelled
    if (labTest.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot verify payment for cancelled test" },
        { status: 400 }
      );
    }
    
    // Check if payment is already fully paid
    if (labTest.charges.paymentStatus === "paid") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Payment is already marked as paid",
          alreadyPaid: true 
        },
        { status: 400 }
      );
    }
    
    let updatedTest;
    let message;
    
    if (verify) {
      // Verify payment
      updatedTest = await LabTest.verifyPayment(testId, userId);
      message = "Payment verified successfully";
      
      // Add verification notes if provided
      if (notes) {
        updatedTest = await LabTest.findByIdAndUpdate(
          testId,
          { $set: { "charges.verificationNotes": notes } },
          { new: true }
        );
      }
    } else {
      // Unverify payment
      updatedTest = await LabTest.unverifyPayment(testId);
      message = "Payment verification removed";
    }
    
    // Populate response
    await updatedTest?.populate([
      { path: "patient", select: "name patientId phone" },
      { path: "paymentVerifiedBy", select: "name role" },
    ]);
    
    return NextResponse.json({
      success: true,
      data: updatedTest,
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