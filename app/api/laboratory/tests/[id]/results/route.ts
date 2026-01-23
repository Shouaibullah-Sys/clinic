// app/api/laboratory/tests/[id]/results/route.ts

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

// PUT: Enter test results
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
    
    // Only laboratory staff and admin can enter results
    if (!["lab_technician", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only laboratory staff can enter results." },
        { status: 403 }
      );
    }
    
    const { id: testId } = await params;
    const body = await request.json();
    const {
      parameters,
      interpretation,
      reportUrl,
      verificationNotes,
    } = body;
    
    // Find lab test
    const labTest = await LabTest.findById(testId);
    
    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }
    
    // Check if test is ready for results
    if (labTest.processingStatus !== "completed") {
      return NextResponse.json(
        { success: false, error: "Test processing not completed yet" },
        { status: 400 }
      );
    }
    
    // Validate parameters
    if (!parameters || !Array.isArray(parameters) || parameters.length === 0) {
      return NextResponse.json(
        { success: false, error: "Test parameters are required" },
        { status: 400 }
      );
    }
    
    // Calculate flags for each parameter
    const processedParameters = parameters.map((param: any) => {
      const processedParam = { ...param };
      
      // Determine flag based on value and normal range
      if (param.value !== undefined && param.normalRange) {
        const numValue = parseFloat(param.value);
        if (!isNaN(numValue)) {
          // Parse normal range (e.g., "3.5-5.5" or "120-140 mg/dL")
          const rangeMatch = param.normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
          if (rangeMatch) {
            const min = parseFloat(rangeMatch[1]);
            const max = parseFloat(rangeMatch[2]);
            
            if (numValue < min) {
              processedParam.flag = "low";
            } else if (numValue > max) {
              processedParam.flag = "high";
            } else {
              processedParam.flag = "normal";
            }
            
            // Check critical values if provided
            if (numValue < (param.criticalLow || -Infinity)) {
              processedParam.flag = "critical";
            } else if (numValue > (param.criticalHigh || Infinity)) {
              processedParam.flag = "critical";
            }
          }
        }
      }
      
      return processedParam;
    });
    
    // Check if any parameter is critical
    const hasCritical = processedParameters.some((p: any) => p.flag === "critical");
    
    const updates: any = {
      status: hasCritical ? "reported" : "completed",
      reportedAt: new Date(),
      "results.parameters": processedParameters,
      verificationStatus: "preliminary",
      "verificationDetails.verifiedBy": new mongoose.Types.ObjectId(userId),
      "verificationDetails.verifiedAt": new Date(),
    };
    
    if (interpretation) updates["results.interpretation"] = interpretation;
    if (reportUrl) updates["results.reportUrl"] = reportUrl;
    if (verificationNotes) updates["verificationDetails.verificationNotes"] = verificationNotes;
    
    const updatedTest = await LabTest.findByIdAndUpdate(
      testId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate([
      { path: "patient", select: "name patientId phone age gender" },
      { path: "doctor", select: "name specialization email" },
      { path: "verificationDetails.verifiedBy", select: "name" },
    ]);
    
    return NextResponse.json({
      success: true,
      data: updatedTest,
      message: hasCritical 
        ? "Test results entered with CRITICAL values - urgent review required"
        : "Test results entered successfully",
      hasCritical,
    });
    
  } catch (error: any) {
    console.error("Error entering test results:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to enter results" },
      { status: 500 }
    );
  }
}