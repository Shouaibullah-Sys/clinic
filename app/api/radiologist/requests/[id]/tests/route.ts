// app/api/radiologist/requests/[id]/tests/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyService } from "@/lib/models/RadiologyService";
import "@/lib/models/Patient";
import "@/lib/models/User";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";
import mongoose from "mongoose";

// PUT: Add tests and parameters to radiology request
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

    // Only radiologists and admins can add tests and parameters
    const allowedRoles = ["radiologist", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only radiologists can add tests and parameters." },
        { status: 403 }
      );
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const { tests, parameters, notes } = body;

    console.log(`Adding tests/parameters to radiology request ${requestId} by ${auth.userName}`);

    // Find the request
    const requestDoc = await RadiologyService.findById(requestId);
    
    if (!requestDoc) {
      return NextResponse.json(
        { success: false, error: "Radiology request not found" },
        { status: 404 }
      );
    }

    // Check if request is in progress
    if (requestDoc.status !== "in-progress" && requestDoc.status !== "scheduled") {
      return NextResponse.json(
        { 
          success: false, 
          error: "Cannot add tests/parameters. Request must be in scheduled or in-progress status.",
          currentStatus: requestDoc.status
        },
        { status: 400 }
      );
    }

    // Update the request with tests and parameters
    // Note: RadiologyService model doesn't have a dedicated tests/parameters field,
    // so we'll store them in the notes field or add them as custom data
    const additionalData: any = {};
    
    if (tests && Array.isArray(tests) && tests.length > 0) {
      additionalData.tests = tests.map((test: any) => ({
        name: test.name || "",
        description: test.description || "",
        performed: test.performed || false,
        performedAt: test.performedAt || null,
        notes: test.notes || ""
      }));
    }

    if (parameters && Array.isArray(parameters) && parameters.length > 0) {
      additionalData.parameters = parameters.map((param: any) => ({
        name: param.name || "",
        value: param.value || "",
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        remarks: param.remarks || ""
      }));
    }

    // Store additional data in notes (as JSON string) or add to the document
    // Since the model doesn't have these fields, we'll add them dynamically
    if (Object.keys(additionalData).length > 0) {
      // Add custom data to the document
      (requestDoc as any).customData = {
        ...(requestDoc as any).customData,
        ...additionalData
      };
    }

    // Add notes if provided
    if (notes) {
      requestDoc.notes = notes;
    }

    // Update status to in-progress if it was scheduled
    if (requestDoc.status === "scheduled") {
      requestDoc.status = "in-progress";
      if (!requestDoc.radiologist) {
        requestDoc.radiologist = new mongoose.Types.ObjectId(auth.userId);
      }
    }

    await requestDoc.save();

    // Populate for response
    const updatedRequest = await RadiologyService.findById(requestId)
      .populate("patient", "name patientId")
      .populate("referringDoctor", "name")
      .populate("radiologist", "name")
      .populate("technician", "name")
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: "Tests and parameters added successfully",
    });

  } catch (error: any) {
    console.error("Error adding tests/parameters to radiology request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add tests/parameters" },
      { status: 500 }
    );
  }
}
