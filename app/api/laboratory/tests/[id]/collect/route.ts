// app/api/laboratory/tests/[id]/collect/route.ts - UPDATED

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import {
  authenticateRequest,
  canAccessLaboratory,
  hasRequiredRole,
} from "@/lib/auth";
import mongoose from "mongoose";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    if (!canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to collect samples.",
        },
        { status: 403 },
      );
    }

    // Only lab technicians and above can collect samples
    const allowedRoles = ["lab_technician", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only lab staff can collect samples.",
        },
        { status: 403 },
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
      results,
      testParameters,
    } = body;

    console.log("Sample collection payload:", body);

    // Find the test
    const test = await LabTest.findById(testId);

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    // DEBUG: Check test structure
    console.log("Test before update:", {
      testId: test.testId,
      hasDoctor: !!test.doctor,
      doctorValue: test.doctor,
      status: test.status,
      collectionStatus: test.collectionStatus,
      paymentVerified: test.paymentVerified,
      priority: test.priority,
    });

    // Check if sample can be collected
    // New workflow: No prerequisite check for processingStatus since we're combining steps
    // Only check if already collected
    if (test.collectionStatus === "collected") {
      return NextResponse.json(
        {
          success: false,
          error: "Sample has already been collected",
          details: {
            collectionStatus: test.collectionStatus,
          },
        },
        { status: 400 },
      );
    }

    // Validate test parameters if provided
    if (testParameters && testParameters.length > 0) {
      for (const param of testParameters) {
        if (!param.name || param.value === undefined || param.value === "") {
          return NextResponse.json(
            {
              success: false,
              error: "Test parameters require at least name and value",
            },
            { status: 400 },
          );
        }
      }
    }

    // Validate sample parameters if provided
    if (specimen && specimen.parameters && specimen.parameters.length > 0) {
      for (const param of specimen.parameters) {
        if (!param.name || (!param.result && !param.value)) {
          return NextResponse.json(
            {
              success: false,
              error: "Sample parameters require at least name and result",
            },
            { status: 400 },
          );
        }
      }
    }

    // Convert string userId to ObjectId
    const collectedBy = new mongoose.Types.ObjectId(auth.userId);

    // Update the test with collection details
    test.collectionStatus = "collected";
    test.status = "completed"; // Sample collection is now the final step
    test.processingStatus = "completed"; // No separate processing step in this workflow

    // Basic collection details
    test.collectionDetails = {
      collectionTime: new Date(),
      collectedBy: collectedBy,
      collectionNotes: collectionNotes || "",
      sampleId: sampleId || "",
      sampleCondition: sampleCondition || "satisfactory",
      sampleConditionNotes: sampleConditionNotes || "",
    };

    // Update specimen details with sample parameters
    if (specimen) {
      test.specimen = {
        type: specimen.type,
        quantity: specimen.quantity || "",
        container: specimen.container || "",
        remarks: specimen.remarks || "",
        collectedBy: collectedBy,
        ...(specimen.parameters &&
          specimen.parameters.length > 0 && {
            parameters: specimen.parameters.map((param: any) => ({
              name: param.name || "",
              // Support both 'result' (new frontend) and 'value' (old structure)
              value: param.result || param.value || "",
              result: param.result || param.value || "",
              unit: param.unit || "",
              remarks: param.remarks || "",
            })),
          }),
      };
    }

    const resolvedResults =
      (testParameters && testParameters.length > 0 && {
        parameters: testParameters.map((p: any) => ({
          name: p.name,
          value: p.value,
          unit: p.unit || "",
          normalRange: p.normalRange || "",
          remarks: p.remarks || "",
        })),
      }) ||
      (results?.parameters && results.parameters.length > 0 && {
        parameters: results.parameters.map((p: any) => ({
          name: p.name,
          value: p.value ?? p.result ?? "",
          unit: p.unit || "",
          normalRange: p.normalRange || "",
          remarks: p.remarks || "",
        })),
      }) ||
      (specimen?.parameters &&
        specimen.parameters.length > 0 && {
          parameters: specimen.parameters.map((p: any) => ({
            name: p.name,
            value: p.value ?? p.result ?? "",
            unit: p.unit || "",
            normalRange: p.normalRange || "",
            remarks: p.remarks || "",
          })),
      });

    // Update results with test parameters if provided
    if (resolvedResults) {
      test.results = {
        parameters: resolvedResults.parameters,
        reportedBy: collectedBy,
        reportedAt: new Date(),
      };
      // Set processingStatus to completed since test parameters are added
      test.processingStatus = "completed";
    }

    test.collectedAt = new Date();

    // DEBUG: Check test before saving
    console.log("Test before save:", {
      doctor: test.doctor,
      hasDoctorValidationError: test.doctor ? false : "No doctor field",
    });

    // Save with error handling
    try {
      await test.save();
      console.log("Test saved successfully!");
    } catch (saveError: any) {
      console.error("Save error details:", {
        message: saveError.message,
        errors: saveError.errors,
        errorType: saveError.name,
      });

      // If it's a validation error for doctor, try to fix it
      if (saveError.name === "ValidationError" && saveError.errors?.doctor) {
        console.log("Attempting to fix doctor validation error...");

        // Try to find a doctor from orderedBy or set a default
        if (!test.doctor && test.orderedBy) {
          // Check if orderedBy is a doctor
          const User = (await import("@/lib/models/User")).User;
          const orderedByUser = await User.findById(test.orderedBy);

          if (orderedByUser && orderedByUser.role === "doctor") {
            test.doctor = test.orderedBy;
            console.log("Assigned orderedBy as doctor:", test.doctor);
          } else {
            // Find any active doctor to assign
            const anyDoctor = await User.findOne({
              role: "doctor",
              active: true,
            });
            if (anyDoctor) {
              test.doctor = anyDoctor._id;
              console.log("Assigned random doctor:", test.doctor);
            }
          }

          // Try to save again
          try {
            await test.save();
            console.log("Test saved successfully after fixing doctor!");
          } catch (secondSaveError: any) {
            console.error("Second save error:", secondSaveError.message);
            throw secondSaveError;
          }
        } else {
          throw saveError;
        }
      } else {
        throw saveError;
      }
    }

    // Populate for response
    const updatedTest = await LabTest.findById(testId)
      .populate("patient", "name patientId")
      .populate("doctor", "name")
      .populate("collectionDetails.collectedBy", "name")
      .populate("results.reportedBy", "name")
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedTest,
      message: "Sample collected successfully",
    });
  } catch (error: any) {
    console.error("Error collecting sample:", error);

    // Provide more detailed error information
    const errorDetails = {
      message: error.message,
      name: error.name,
      ...(error.errors && { errors: Object.keys(error.errors) }),
      ...(error.code && { code: error.code }),
    };

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to collect sample",
        details: errorDetails,
      },
      { status: 500 },
    );
  }
}
