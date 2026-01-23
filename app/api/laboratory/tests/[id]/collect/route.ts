// app/api/laboratory/tests/[id]/collect/route.ts

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

// PUT: Collect sample for lab test
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
    
    // Only laboratory staff and admin can collect samples
    if (!["lab_technician", "admin", "nurse", "doctor"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only authorized staff can collect samples." },
        { status: 403 }
      );
    }
    
    const { id: testId } = await params;
    const body = await request.json();
    const {
      sampleId,
      sampleCondition = "satisfactory",
      collectionNotes,
      sampleConditionNotes,
    } = body;
    
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
        { success: false, error: "Cannot collect sample for cancelled test" },
        { status: 400 }
      );
    }
    
    // Check payment verification for non-urgent tests
    if (labTest.priority === "routine" && !labTest.paymentVerified) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Payment not verified. Please verify payment before collecting sample.",
          requiresPaymentVerification: true 
        },
        { status: 400 }
      );
    }
    
    // Check if sample can be collected
    if (!labTest.canCollectSample) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Sample cannot be collected. Check collection status and payment verification." 
        },
        { status: 400 }
      );
    }
    
    // Update collection details
    const updates: any = {
      collectionStatus: "collected",
      "collectionDetails.collectionTime": new Date(),
      "collectionDetails.collectedBy": new mongoose.Types.ObjectId(userId),
      "collectionDetails.sampleId": sampleId,
      "collectionDetails.sampleCondition": sampleCondition,
    };
    
    if (collectionNotes) updates["collectionDetails.collectionNotes"] = collectionNotes;
    if (sampleConditionNotes) updates["collectionDetails.sampleConditionNotes"] = sampleConditionNotes;
    
    // If sample condition is not satisfactory, update status
    if (sampleCondition !== "satisfactory") {
      updates.collectionStatus = "rejected";
      updates.status = "cancelled";
      updates.cancelledAt = new Date();
    }
    
    const updatedTest = await LabTest.findByIdAndUpdate(
      testId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate([
      { path: "patient", select: "name patientId phone" },
      { path: "doctor", select: "name specialization" },
      { path: "collectionDetails.collectedBy", select: "name" },
    ]);
    
    return NextResponse.json({
      success: true,
      data: updatedTest,
      message: sampleCondition === "satisfactory" 
        ? "Sample collected successfully" 
        : "Sample rejected due to unsatisfactory condition",
    });
    
  } catch (error: any) {
    console.error("Error collecting sample:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to collect sample" },
      { status: 500 }
    );
  }
}