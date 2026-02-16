// app/api/laboratory/direct-tests/[id]/collect/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import {
  authenticateRequest,
  canAccessLaboratory,
  hasRequiredRole,
} from "@/lib/auth";
import mongoose from "mongoose";
import { AppSetting, IAppSetting } from "@/lib/models/AppSetting";

const SETTING_KEY = "directLabTestPaymentRequired";

export async function POST(
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

    console.log("Sample collection payload for direct test:", body);

    // Find the test
    const test = await LabTest.findById(testId);

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Direct lab test not found" },
        { status: 404 },
      );
    }

    // Verify this is a direct test
    if (!test.isDirectTest) {
      return NextResponse.json(
        { success: false, error: "This is not a direct lab test" },
        { status: 400 },
      );
    }

    const setting = (await AppSetting.findOne({
      key: SETTING_KEY,
    }).lean()) as IAppSetting | null;
    const paymentRequired = setting?.value ?? true;

    // Check if payment is verified (if required)
    if (paymentRequired && !test.paymentVerified) {
      console.log(
        "Cannot collect sample. Payment not verified yet. Conditions:",
        {
          paymentVerified: test.paymentVerified,
          collectionStatus: test.collectionStatus,
        },
      );

      return NextResponse.json(
        {
          success: false,
          error: "Payment must be verified before collecting sample",
          details: {
            paymentVerified: test.paymentVerified,
            collectionStatus: test.collectionStatus,
          },
        },
        { status: 400 },
      );
    }

    // Check if sample has already been collected
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
    test.status = "completed"; // Collection is the final step
    test.processingStatus = "completed"; // No separate processing step in this workflow
    test.finalized = true;
    test.finalizedAt = new Date();
    test.finalizedBy = collectedBy;

    // Basic collection details
    test.collectionDetails = {
      collectionTime: new Date(),
      collectedBy: collectedBy,
      collectionNotes: collectionNotes || "",
      sampleId: sampleId || "",
      sampleCondition: sampleCondition || "satisfactory",
      sampleConditionNotes: sampleConditionNotes || "",
    };

    // Update specimen details if provided
    if (specimen) {
      test.specimen = {
        type: specimen.type,
        quantity: specimen.quantity || "",
        container: specimen.container || "",
        remarks: specimen.remarks || "",
        collectedBy: collectedBy,
        collectionTime: new Date(),
        ...(specimen.parameters &&
          specimen.parameters.length > 0 && {
            parameters: specimen.parameters.map((param: any) => ({
              name: param.name || "",
              value: param.result || param.value || "",
              unit: param.unit || "",
              remarks: param.remarks || "",
            })),
          }),
      };
    }

    const resolvedResults =
      (testParameters &&
        testParameters.length > 0 && {
          parameters: testParameters.map((p: any) => ({
            name: p.name,
            value: p.value,
            unit: p.unit || "",
            normalRange: p.normalRange || "",
            remarks: p.remarks || "",
          })),
        }) ||
      (results?.parameters &&
        results.parameters.length > 0 && {
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
      test.readyForPrint = true;
    } else {
      test.readyForPrint = false;
    }

    test.collectedAt = new Date();

    // Save the test
    await test.save();
    console.log("Direct test sample collected successfully!");

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
    console.error("Error collecting sample for direct test:", error);

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
