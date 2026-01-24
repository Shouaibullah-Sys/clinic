// app/api/laboratory/tests/[id]/collect/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest, canAccessLaboratory, hasRequiredRole } from "@/lib/auth";
import mongoose from "mongoose";

export async function PUT(
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

    if (!canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to collect samples." },
        { status: 403 }
      );
    }

    // Only lab technicians and above can collect samples
    const allowedRoles = ["lab_technician", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only lab staff can collect samples." },
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
      specimen,
    } = body;

    console.log("Sample collection payload:", body);

    // Find the test
    const test = await LabTest.findById(testId);
    
    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }

    // Check if sample can be collected
    if (!test.canCollectSample) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Sample cannot be collected",
          details: {
            status: test.status,
            collectionStatus: test.collectionStatus,
            paymentVerified: test.paymentVerified,
            priority: test.priority,
            canCollectSample: test.canCollectSample
          }
        },
        { status: 400 }
      );
    }

    // Convert string userId to ObjectId
    const collectedBy = new mongoose.Types.ObjectId(auth.userId);

    // Update the test with collection details
    test.collectionStatus = "collected";
    test.status = "collected";
    
    // Basic collection details
    test.collectionDetails = {
      collectionTime: new Date(),
      collectedBy: collectedBy,
      collectionNotes: collectionNotes || "",
      sampleId: sampleId || "",
      sampleCondition: sampleCondition || "satisfactory",
      sampleConditionNotes: sampleConditionNotes || "",
    };
    
    // Update specimen details
    if (specimen) {
      test.specimen = {
        type: specimen.type,
        quantity: specimen.quantity || "",
        container: specimen.container || "",
        remarks: specimen.remarks || "",
        collectedBy: collectedBy,
        ...(specimen.parameters && specimen.parameters.length > 0 && {
          parameters: specimen.parameters.map((param: any) => ({
            name: param.name || "",
            value: param.value || "",
            unit: param.unit || "",
            remarks: param.remarks || "",
          })),
        }),
      };
    }
    
    test.collectedAt = new Date();

    await test.save();

    // Populate for response
    const updatedTest = await LabTest.findById(testId)
      .populate("patient", "name patientId")
      .populate("doctor", "name")
      .populate("collectionDetails.collectedBy", "name")
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedTest,
      message: "Sample collected successfully",
    });

  } catch (error: any) {
    console.error("Error collecting sample:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to collect sample" },
      { status: 500 }
    );
  }
}