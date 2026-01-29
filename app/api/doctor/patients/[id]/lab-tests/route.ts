import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { Appointment } from "@/lib/models/Appointment";
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

// GET: Get lab tests for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;

    await dbConnect();

    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const userId = payload.id as string;
    const userRole = payload.role as string;

    console.log(
      `Fetching lab tests for patient ${patientId} by doctor ${userId}`,
    );

    // Only doctors can access
    if (userRole !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 },
      );
    }

    const doctorId = new mongoose.Types.ObjectId(userId);

    // Get lab tests for this patient, either ordered by this doctor or linked to appointments with this doctor
    const labTests = await LabTest.find({
      $or: [
        { patient: patientId, doctor: doctorId },
        {
          patient: patientId,
          appointment: { $exists: true },
          doctor: doctorId,
        },
      ],
    })
      .select(
        "_id testId testName category orderedAt status collectionStatus priority instructions results reportedDate charges price discountedPrice",
      )
      .populate("doctor", "name")
      .populate("appointment", "appointmentId date")
      .sort({ orderedAt: -1 })
      .lean();

    console.log(`Found ${labTests.length} lab tests for patient ${patientId}`);

    return NextResponse.json({
      success: true,
      data: labTests,
    });
  } catch (error: any) {
    console.error("Error fetching lab tests:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab tests" },
      { status: 500 },
    );
  }
}

// POST: Order a new lab test for a patient
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;

    await dbConnect();

    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const userId = payload.id as string;
    const userRole = payload.role as string;

    console.log(
      `Ordering lab test for patient ${patientId} by doctor ${userId}`,
    );

    // Only doctors can order lab tests
    if (!["doctor", "admin"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only doctors can order lab tests.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      appointmentId,
      testName,
      category,
      priority = "routine",
      notes,
    } = body;

    // Validation
    if (!testName || !category) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: testName and category are required",
        },
        { status: 400 },
      );
    }

    // Set default price (will be updated by receptionist)
    const priceNum = 0;

    // Use consolidated notes field for both description and instructions
    const description = notes?.trim();
    const instructions = notes?.trim();

    // Check if appointment exists and belongs to patient (if provided)
    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findOne({
        _id: appointmentId,
        patient: patientId,
      });

      if (!appointment) {
        return NextResponse.json(
          {
            success: false,
            error: "Appointment not found or does not belong to this patient",
          },
          { status: 404 },
        );
      }
    }

    const doctorId = new mongoose.Types.ObjectId(userId);

    // Create lab test object
    const labTestData: any = {
      patient: patientId,
      doctor: doctorId,
      testName: testName.trim(),
      category,
      description: description,
      price: priceNum,
      priority,
      notes: notes?.trim(),
      instructions: instructions,
      orderedBy: doctorId,
      orderedAt: new Date(),
      status: "ordered",
      collectionStatus: "pending",
      processingStatus: "pending",
      verificationStatus: "pending",
      paymentVerified: false,
      charges: {
        basePrice: priceNum,
        tax: 0,
        discount: 0,
        otherCharges: 0,
        totalAmount: priceNum,
        paid: 0,
        due: priceNum,
        paymentStatus: "pending",
      },
    };

    // Add appointment if provided
    if (appointmentId) {
      labTestData.appointment = appointmentId;
    }

    // Automatically derive specimen type from category
    const categoryToSpecimenMap: { [key: string]: string } = {
      hematology: "blood",
      blood_test: "blood",
      urine_test: "urine",
      stool_test: "stool",
      biopsy: "tissue",
      culture: "other",
      hormone_test: "blood",
      genetic_test: "blood",
      other: "other",
    };

    const specimenType = categoryToSpecimenMap[category] || "other";

    // Always include specimen type (automatically derived from category)
    labTestData.specimen = {
      type: specimenType,
    };

    // Create and save lab test
    const labTest = new LabTest(labTestData);
    await labTest.save();

    // If appointment exists, update it to reference this lab test
    if (appointmentId && appointment) {
      await Appointment.findByIdAndUpdate(
        appointmentId,
        { $addToSet: { labTests: labTest._id } },
        { new: true },
      );
    }

    // Populate response data
    await labTest.populate([
      { path: "patient", select: "name patientId" },
      { path: "doctor", select: "name specialization" },
      { path: "orderedBy", select: "name" },
      ...(appointmentId
        ? [{ path: "appointment", select: "appointmentId date" }]
        : []),
    ]);

    console.log(
      `Lab test ordered successfully: ${labTest.testId} for appointment: ${appointmentId || "No appointment linked"}`,
    );

    return NextResponse.json(
      {
        success: true,
        data: labTest,
        message: "Lab test ordered successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error ordering lab test:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 },
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Duplicate test ID detected" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to order lab test" },
      { status: 500 },
    );
  }
}
