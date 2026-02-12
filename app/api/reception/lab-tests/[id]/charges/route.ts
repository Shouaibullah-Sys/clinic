// app/api/reception/lab-tests/[id]/charges/route.ts

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

// Helper function to safely populate appointment with proper date handling
async function safePopulateLabTest(labTest: any) {
  if (!labTest) return labTest;

  // First populate all other fields except appointment
  const populated = await LabTest.populate(labTest, [
    { path: "patient", select: "name patientId phone" },
    { path: "doctor", select: "name specialization" },
    { path: "charges.collectedBy", select: "name" },
    { path: "paymentVerifiedBy", select: "name" },
    { path: "orderedBy", select: "name" },
  ]);

  // Now safely handle appointment population separately
  if (populated.appointment) {
    const Appointment = (await import("@/lib/models/Appointment")).Appointment;
    const appointment = await Appointment.findById(populated.appointment)
      .select("appointmentId date startTime endTime")
      .lean();

    if (appointment) {
      // Convert date strings to Date objects
      (populated as any).appointment = {
        ...appointment,
        date: appointment.date ? new Date(appointment.date) : null,
        startTime: appointment.startTime
          ? new Date(appointment.startTime)
          : null,
        endTime: appointment.endTime ? new Date(appointment.endTime) : null,
      };
    }
  }

  return populated;
}

// POST: Process payment for lab test (receptionist)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    // Only receptionist and admin can process payments
    if (!["receptionist", "admin"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only receptionists can process payments.",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;
    const body = await request.json();
    const {
      tax,
      discount,
      otherCharges,
      paymentMethod,
      paidAmount,
      transactionId,
      verifyPayment = true,
      price,
    } = body;

    // Find lab test
    const labTest = await LabTest.findById(testId);

    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    // Check if test is cancelled
    if (labTest.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot process payment for cancelled test" },
        { status: 400 },
      );
    }

    // Validate price if provided (must be >= 0)
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Price must be a valid number greater than or equal to 0",
          },
          { status: 400 },
        );
      }
    }

    // Calculate new paid amount
    const currentPaid = labTest.charges.paid || 0;
    const newPaidAmount =
      paidAmount !== undefined ? parseFloat(paidAmount) : currentPaid;

    // Calculate total amount - use provided price if available, otherwise use existing price
    const effectivePrice =
      price !== undefined
        ? parseFloat(price)
        : labTest.discountedPrice || labTest.price;
    const totalAmount = effectivePrice;

    // Check if payment exceeds total amount
    if (newPaidAmount > totalAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount (${newPaidAmount}) exceeds total amount (${totalAmount})`,
          maxAllowed: totalAmount,
        },
        { status: 400 },
      );
    }

    // Update ONLY the charges fields
    const updates: any = {};

    if (tax !== undefined) updates["charges.tax"] = parseFloat(tax);
    if (discount !== undefined)
      updates["charges.discount"] = parseFloat(discount);
    if (otherCharges !== undefined)
      updates["charges.otherCharges"] = parseFloat(otherCharges);
    if (paymentMethod) updates["charges.paymentMethod"] = paymentMethod;
    if (transactionId) updates["charges.transactionId"] = transactionId;
    if (price !== undefined) updates["price"] = parseFloat(price);

    if (paidAmount !== undefined) {
      updates["charges.paid"] = newPaidAmount;
      updates["charges.paymentDate"] = new Date();
      updates["charges.collectedBy"] = new mongoose.Types.ObjectId(userId);

      // Auto-verify payment if fully paid and verifyPayment is true
      const isFullyPaid = newPaidAmount >= totalAmount;
      if (isFullyPaid && verifyPayment) {
        updates.paymentVerified = true;
        updates.paymentVerifiedBy = new mongoose.Types.ObjectId(userId);
        updates.paymentVerifiedAt = new Date();

        // Add verification note
        updates["verificationDetails.verificationNotes"] =
          `Payment verified automatically upon full payment collection. Collected by receptionist.`;
      }
    }

    // Use findOneAndUpdate to only update the specific fields
    const updatedLabTest = await LabTest.findByIdAndUpdate(
      testId,
      {
        $set: updates,
        $inc: { "charges.totalAmount": 0 }, // Force update calculation in pre-save hook
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedLabTest) {
      return NextResponse.json(
        { success: false, error: "Failed to process payment" },
        { status: 500 },
      );
    }

    console.log(
      `Payment processed for test ${testId}: paid=${updatedLabTest.charges.paid}, paymentStatus=${updatedLabTest.charges.paymentStatus}, paymentVerified=${updatedLabTest.paymentVerified}`,
    );

    // Check if sample collection can now proceed
    let canCollectSample = false;
    let collectionMessage = "";

    if (updatedLabTest.paymentVerified) {
      canCollectSample = updatedLabTest.canCollectSample;
      collectionMessage = canCollectSample
        ? "Payment verified. Sample can now be collected."
        : "Payment verified but sample collection not yet available.";
    } else if (updatedLabTest.charges.paid > 0) {
      collectionMessage =
        "Partial payment received. Full payment required for sample collection.";
    }

    // Safely populate the lab test with proper date handling
    const populatedLabTest = await safePopulateLabTest(updatedLabTest);

    return NextResponse.json({
      success: true,
      data: populatedLabTest,
      paymentStatus: {
        paid: updatedLabTest.charges.paid,
        due: updatedLabTest.charges.due,
        total: updatedLabTest.charges.totalAmount,
        isFullyPaid:
          updatedLabTest.charges.paid >= updatedLabTest.charges.totalAmount,
        paymentVerified: updatedLabTest.paymentVerified,
      },
      collectionInfo: {
        canCollectSample,
        message: collectionMessage,
        requiresPaymentVerification:
          !updatedLabTest.paymentVerified &&
          updatedLabTest.priority === "routine",
      },
      message: "Payment processed successfully",
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);

    // Handle specific validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: `Validation error: ${errors.join(", ")}` },
        { status: 400 },
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "A duplicate key error occurred" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to process payment" },
      { status: 500 },
    );
  }
}

// GET: Get lab test charges details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    const userRole = payload.role as string;

    // Only receptionist, admin, and doctor can view charges
    if (!["receptionist", "admin", "doctor"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 },
      );
    }

    const { id: testId } = await params;

    const labTest = await LabTest.findById(testId)
      .populate("patient", "name patientId phone")
      .populate("doctor", "name specialization")
      .populate("charges.collectedBy", "name")
      .populate("paymentVerifiedBy", "name")
      .populate("orderedBy", "name")
      .lean();

    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    // Safely handle appointment separately
    if (labTest.appointment) {
      const Appointment = (await import("@/lib/models/Appointment"))
        .Appointment;
      const appointment = await Appointment.findById(labTest.appointment)
        .select("appointmentId date startTime endTime")
        .lean();

      if (appointment) {
        // Convert date strings to Date objects
        (labTest as any).appointment = {
          ...appointment,
          date: appointment.date ? new Date(appointment.date) : null,
          startTime: appointment.startTime
            ? new Date(appointment.startTime)
            : null,
          endTime: appointment.endTime ? new Date(appointment.endTime) : null,
        };
      }
    }

    // Calculate collection eligibility
    const canCollectSample =
      labTest.status !== "cancelled" &&
      (labTest.paymentVerified || labTest.priority !== "routine") &&
      ["pending", "scheduled"].includes(labTest.collectionStatus);

    return NextResponse.json({
      success: true,
      data: {
        ...labTest,
        collectionEligibility: {
          canCollectSample,
          requiresPaymentVerification:
            !labTest.paymentVerified && labTest.priority === "routine",
          paymentStatus: labTest.charges.paymentStatus,
          paymentVerified: labTest.paymentVerified,
          priority: labTest.priority,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching lab test charges:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch charges" },
      { status: 500 },
    );
  }
}

// PATCH: Manually verify payment (for cases where payment was made offline)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    // Only receptionist, laboratory staff, and admin can verify payments
    if (!["receptionist", "lab_technician", "admin"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only authorized staff can verify payments.",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;
    const body = await request.json();
    const { verify = true, notes, paymentMethod, transactionId } = body;

    // Find lab test
    const labTest = await LabTest.findById(testId);

    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    // Check if test is cancelled
    if (labTest.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot verify payment for cancelled test" },
        { status: 400 },
      );
    }

    let updatedTest;
    let message;

    if (verify) {
      // Verify payment
      const updates: any = {
        paymentVerified: true,
        paymentVerifiedBy: new mongoose.Types.ObjectId(userId),
        paymentVerifiedAt: new Date(),
      };

      // Add payment method and transaction ID if provided
      if (paymentMethod) updates["charges.paymentMethod"] = paymentMethod;
      if (transactionId) updates["charges.transactionId"] = transactionId;

      // Add verification notes
      if (notes) {
        updates["verificationDetails.verificationNotes"] =
          (labTest.verificationDetails?.verificationNotes || "") +
          `\n${new Date().toISOString()}: ${notes} (Verified by: ${userRole})`;
      }

      updatedTest = await LabTest.findByIdAndUpdate(
        testId,
        { $set: updates },
        { new: true },
      );

      message = "Payment verified successfully";
    } else {
      // Unverify payment
      updatedTest = await LabTest.unverifyPayment(testId);
      message = "Payment verification removed";
    }

    // Populate response
    const populatedTest = await safePopulateLabTest(updatedTest);

    return NextResponse.json({
      success: true,
      data: populatedTest,
      message,
    });
  } catch (error: any) {
    console.error("Error manually verifying payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify payment" },
      { status: 500 },
    );
  }
}
