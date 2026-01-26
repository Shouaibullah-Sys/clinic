// app/api/laboratory/create-test/route.ts

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
    console.error("Token verification error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
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
    const userName = payload.name as string;
    
    // Only admin and lab technicians can create test data
    if (!["admin", "lab_technician", "laboratory"].includes(userRole)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. Only admin and laboratory staff can create test data.",
          userRole: userRole
        },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const {
      patientId,
      doctorId,
      testName,
      category,
      price,
      priority = "routine",
      status = "ordered",
      collectionStatus = "pending",
      processingStatus = "pending",
      paymentVerified = false,
      notes = "Test data created for laboratory testing"
    } = body;
    
    // Validation
    if (!patientId || !doctorId || !testName || !category || !price) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: patientId, doctorId, testName, category, and price are required" 
        },
        { status: 400 }
      );
    }
    
    // Generate unique test ID
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(100 + Math.random() * 900);
    const testId = `TEST${year}${month}${day}${random}`;
    
    // Create lab test data
    const labTestData: any = {
      testId,
      testName,
      category,
      patient: new mongoose.Types.ObjectId(patientId),
      doctor: new mongoose.Types.ObjectId(doctorId),
      price: parseFloat(price),
      status,
      collectionStatus,
      processingStatus,
      priority,
      paymentVerified,
      notes: `${notes} - Created by ${userName} (${userRole})`,
      orderedBy: new mongoose.Types.ObjectId(userId),
      orderedAt: new Date(),
      charges: {
        basePrice: parseFloat(price),
        tax: 0,
        discount: 0,
        otherCharges: 0,
        totalAmount: parseFloat(price),
        paid: paymentVerified ? parseFloat(price) : 0,
        due: paymentVerified ? 0 : parseFloat(price),
        paymentStatus: paymentVerified ? "paid" : "pending",
        paymentMethod: paymentVerified ? "cash" : undefined
      }
    };
    
    // Add collection details if collected
    if (collectionStatus === "collected") {
      labTestData.collectionDetails = {
        collectionTime: new Date(),
        collectedBy: new mongoose.Types.ObjectId(userId),
        collectionNotes: "Sample collected for testing",
        sampleId: `SMP${year}${month}${day}${Math.floor(100 + Math.random() * 900)}`,
        sampleCondition: "satisfactory"
      };
      labTestData.collectedAt = new Date();
      
      // Generate lab reference ID
      labTestData.labReferenceId = `LREF${year}${month}${day}${Math.floor(100 + Math.random() * 900)}`;
    }
    
    // Add processing details if processing
    if (processingStatus === "processing") {
      labTestData.processingDetails = {
        processingStartTime: new Date(),
        processedBy: new mongoose.Types.ObjectId(userId),
        equipmentUsed: "Automated Analyzer",
        reagentsUsed: ["Standard reagents"],
        processingNotes: "Test currently being processed"
      };
    }
    
    // Add results if completed
    if (processingStatus === "completed") {
      labTestData.results = {
        parameters: [
          {
            name: "Test Parameter",
            value: "Normal",
            unit: "Qualitative",
            normalRange: "Normal",
            flag: "normal",
            remarks: "Test completed successfully"
          }
        ],
        interpretation: "Test results within normal range",
        reportedBy: new mongoose.Types.ObjectId(userId),
        reportedAt: new Date()
      };
      labTestData.completedAt = new Date();
    }
    
    // Add payment verification details if verified
    if (paymentVerified) {
      labTestData.paymentVerifiedBy = new mongoose.Types.ObjectId(userId);
      labTestData.paymentVerifiedAt = new Date();
    }
    
    // Create and save lab test
    const labTest = new LabTest(labTestData);
    await labTest.save();
    
    console.log(`Created test lab test: ${testId} - ${testName}`);
    console.log(`Status: ${status}, Collection: ${collectionStatus}, Processing: ${processingStatus}`);
    console.log(`Payment Verified: ${paymentVerified}, Priority: ${priority}`);
    
    // Populate the response
    const populatedTest = await LabTest.findById(labTest._id)
      .populate("patient", "name patientId phone")
      .populate("doctor", "name specialization")
      .populate("orderedBy", "name")
      .lean();
    
    return NextResponse.json({
      success: true,
      data: populatedTest,
      message: "Test lab test created successfully"
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error creating test lab test:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to create test lab test",
        details: error.errors || {}
      },
      { status: 500 }
    );
  }
}