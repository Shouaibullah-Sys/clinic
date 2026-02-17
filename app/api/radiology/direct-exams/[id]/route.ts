// app/api/radiology/direct-exams/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { authenticateRequest } from "@/lib/auth";

// GET: Get a single direct radiology exam by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Check if user has access to radiology
    const allowedRoles = [
      "radiology_technician",
      "radiologist",
      "admin",
      "receptionist",
      "doctor",
    ];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to access direct radiology exams.",
        },
        { status: 403 },
      );
    }

    // Unwrap the params promise
    const { id: examId } = await params;

    // Find the radiology exam
    const examResult = await RadiologyExam.findById(examId)
      .populate("patient", "name patientId phone guardian dateOfBirth gender")
      .populate("doctor", "name specialization")
      .populate("createdBy", "name")
      .populate("finalizedBy", "name")
      .populate("printedBy", "name")
      .populate("charges.collectedBy", "name")
      .populate("paymentVerifiedBy", "name")
      .populate("results.reportedBy", "name")
      .populate("results.verifiedBy", "name")
      .lean();
    const radiologyExam = examResult as Record<string, any>;

    if (!radiologyExam) {
      return NextResponse.json(
        { success: false, error: "Radiology exam not found" },
        { status: 404 },
      );
    }

    // Verify this is a direct exam
    if (!radiologyExam.isDirectExam) {
      return NextResponse.json(
        { success: false, error: "This is not a direct radiology exam" },
        { status: 400 },
      );
    }

    const fallbackBodyPart =
      typeof radiologyExam.examName === "string" &&
      radiologyExam.examName.includes(" - ")
        ? radiologyExam.examName.split(" - ").slice(1).join(" - ").trim()
        : undefined;

    if (!radiologyExam.modality) {
      radiologyExam.modality = {};
    }

    if (!radiologyExam.modality.type && radiologyExam.category) {
      radiologyExam.modality.type = radiologyExam.category;
    }

    if (!radiologyExam.modality.bodyPart && fallbackBodyPart) {
      radiologyExam.modality.bodyPart = fallbackBodyPart;
    }

    return NextResponse.json({
      success: true,
      data: radiologyExam,
    });
  } catch (error: any) {
    console.error("Error fetching direct radiology exam:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch direct radiology exam",
      },
      { status: 500 },
    );
  }
}

// PUT: Update exam details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Check if user has access to radiology
    const allowedRoles = ["radiology_technician", "admin", "receptionist"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to update radiology exams.",
        },
        { status: 403 },
      );
    }

    // Unwrap the params promise
    const { id: examId } = await params;
    const body = await request.json();

    // Find the radiology exam
    const radiologyExam = await RadiologyExam.findById(examId);
    if (!radiologyExam) {
      return NextResponse.json(
        { success: false, error: "Radiology exam not found" },
        { status: 404 },
      );
    }

    // Verify this is a direct exam
    if (!radiologyExam.isDirectExam) {
      return NextResponse.json(
        { success: false, error: "This is not a direct radiology exam" },
        { status: 400 },
      );
    }

    // Check if exam is already finalized
    if (radiologyExam.finalized) {
      return NextResponse.json(
        { success: false, error: "Cannot update a finalized exam" },
        { status: 400 },
      );
    }

    // Update allowed fields
    if (body.examName) {
      radiologyExam.examName = body.examName;
    }
    if (body.description) {
      radiologyExam.description = body.description;
    }
    if (body.price !== undefined) {
      radiologyExam.price = body.price;
    }
    if (body.category) {
      radiologyExam.category = body.category;
    }
    if (body.bodyPart) {
      if (!radiologyExam.modality) {
        radiologyExam.modality = { type: radiologyExam.category };
      }
      radiologyExam.modality.bodyPart = body.bodyPart;
    }
    if (body.view) {
      if (!radiologyExam.modality) {
        radiologyExam.modality = { type: radiologyExam.category };
      }
      radiologyExam.modality.view = body.view;
    }
    if (body.priority) {
      const validPriorities = ["routine", "urgent", "emergency"];
      if (validPriorities.includes(body.priority)) {
        radiologyExam.priority = body.priority;
      }
    }
    if (body.notes !== undefined) {
      radiologyExam.notes = body.notes;
    }
    if (body.contrastUsed !== undefined) {
      if (!radiologyExam.modality) {
        radiologyExam.modality = { type: radiologyExam.category };
      }
      radiologyExam.modality.contrastUsed = body.contrastUsed;
    }
    if (body.contrastType) {
      if (!radiologyExam.modality) {
        radiologyExam.modality = { type: radiologyExam.category };
      }
      radiologyExam.modality.contrastType = body.contrastType;
    }

    await radiologyExam.save();

    // Populate the response
    const populatedExam = await RadiologyExam.findById(radiologyExam._id)
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .lean();

    console.log(
      `Direct radiology exam ${radiologyExam.examId} updated by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: populatedExam,
      message: "Direct radiology exam updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating direct radiology exam:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update direct radiology exam",
      },
      { status: 500 },
    );
  }
}
