// app/api/laboratory/tests/[id]/process/route.ts

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

// PUT: Process lab test
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
    
    // Only laboratory staff and admin can process tests
    if (!["lab_technician", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only laboratory staff can process tests." },
        { status: 403 }
      );
    }
    
    const { id: testId } = await params;
    const body = await request.json();
    const {
      action, // "start", "complete", "fail"
      equipmentUsed,
      reagentsUsed,
      qualityControlPassed,
      qualityControlNotes,
      processingNotes,
    } = body;
    
    // Find lab test
    const labTest = await LabTest.findById(testId);
    
    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }
    
    // Check if test can be processed
    if (!labTest.canProcess) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Test cannot be processed. Check sample collection and payment verification." 
        },
        { status: 400 }
      );
    }
    
    const updates: any = {};
    let message = "";
    
    switch (action) {
      case "start":
        updates.processingStatus = "processing";
        updates["processingDetails.processingStartTime"] = new Date();
        updates["processingDetails.processedBy"] = new mongoose.Types.ObjectId(userId);
        if (equipmentUsed) updates["processingDetails.equipmentUsed"] = equipmentUsed;
        if (reagentsUsed) updates["processingDetails.reagentsUsed"] = reagentsUsed;
        message = "Test processing started";
        break;
        
      case "complete":
        updates.processingStatus = "completed";
        updates["processingDetails.processingEndTime"] = new Date();
        updates.status = "completed";
        updates.completedAt = new Date();
        
        // Quality control
        if (qualityControlPassed !== undefined) {
          updates["processingDetails.qualityControl.passed"] = qualityControlPassed;
          updates["processingDetails.qualityControl.performedBy"] = new mongoose.Types.ObjectId(userId);
          updates["processingDetails.qualityControl.performedAt"] = new Date();
          if (qualityControlNotes) updates["processingDetails.qualityControl.notes"] = qualityControlNotes;
        }
        
        if (processingNotes) updates["processingDetails.processingNotes"] = processingNotes;
        message = "Test processing completed";
        break;
        
      case "fail":
        updates.processingStatus = "failed";
        updates.status = "cancelled";
        updates.cancelledAt = new Date();
        if (processingNotes) updates["processingDetails.processingNotes"] = processingNotes;
        message = "Test processing failed";
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: "Invalid action. Use 'start', 'complete', or 'fail'." },
          { status: 400 }
        );
    }
    
    const updatedTest = await LabTest.findByIdAndUpdate(
      testId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate([
      { path: "patient", select: "name patientId phone" },
      { path: "doctor", select: "name specialization" },
      { path: "processingDetails.processedBy", select: "name" },
      { path: "processingDetails.qualityControl.performedBy", select: "name" },
    ]);
    
    return NextResponse.json({
      success: true,
      data: updatedTest,
      message,
    });
    
  } catch (error: any) {
    console.error("Error processing test:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process test" },
      { status: 500 }
    );
  }
}