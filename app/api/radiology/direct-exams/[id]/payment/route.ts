// app/api/radiology/direct-exams/[id]/payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { Payment } from "@/lib/models/Payment";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// POST: Process payment for a direct radiology exam
export async function POST(
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

    // Only receptionists and admin can process payments
    const allowedRoles = ["receptionist", "admin"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only receptionists can process payments.",
        },
        { status: 403 },
      );
    }

    // Unwrap the params promise
    const { id: examId } = await params;

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

    // Check if payment is already completed
    if (radiologyExam.charges.paymentStatus === "paid") {
      return NextResponse.json(
        { success: false, error: "Payment has already been processed" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.amount || typeof body.amount !== "number") {
      return NextResponse.json(
        { success: false, error: "Payment amount is required" },
        { status: 400 },
      );
    }

    if (!body.paymentMethod) {
      return NextResponse.json(
        { success: false, error: "Payment method is required" },
        { status: 400 },
      );
    }

    // Validate payment method
    const validPaymentMethods = [
      "cash",
      "card",
      "insurance",
      "online",
      "check",
      "bank_transfer",
    ];
    if (!validPaymentMethods.includes(body.paymentMethod)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment method" },
        { status: 400 },
      );
    }

    // Validate amount
    const totalAmount = radiologyExam.charges.totalAmount;
    const paidAmount = radiologyExam.charges.paid || 0;
    const dueAmount = totalAmount - paidAmount;

    if (body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Payment amount must be greater than 0" },
        { status: 400 },
      );
    }

    if (body.amount > dueAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount exceeds due amount. Due: ${dueAmount}, Provided: ${body.amount}`,
        },
        { status: 400 },
      );
    }

    // Validate discount if provided
    let discountAmount = 0;
    if (body.discount !== undefined && body.discount !== null) {
      if (typeof body.discount !== "number" || body.discount < 0) {
        return NextResponse.json(
          { success: false, error: "Discount must be a non-negative number" },
          { status: 400 },
        );
      }
      discountAmount = body.discount;
    }

    // Calculate new payment status
    const newPaidAmount = paidAmount + body.amount;
    const newDueAmount = totalAmount - newPaidAmount;
    let newPaymentStatus: "pending" | "partial" | "paid" | "cancelled" =
      "partial";

    if (newDueAmount <= 0) {
      newPaymentStatus = "paid";
    } else if (newPaidAmount > 0) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = "pending";
    }

    // Debug logging before payment verification
    console.log(
      `[DEBUG] Payment processing for exam ${radiologyExam.examId}:`,
      {
        totalAmount,
        paidAmount,
        bodyAmount: body.amount,
        newPaidAmount,
        newDueAmount,
        newPaymentStatus,
        currentPaymentVerified: radiologyExam.paymentVerified,
      },
    );

    // Create payment record
    const paymentData = {
      patient: radiologyExam.patient,
      paymentMethod: body.paymentMethod,
      amount: body.amount,
      taxAmount: 0,
      discountAmount: discountAmount,
      netAmount: body.amount - discountAmount,
      status: "completed",
      paymentDate: new Date(),
      collectedBy: new mongoose.Types.ObjectId(auth.userId!),
      department: "radiology",
      serviceType: "direct_radiology_exam",
      notes: body.notes,
      // Additional fields for card payments
      ...(body.paymentMethod === "card" && {
        cardType: body.cardType,
        cardLastFour: body.cardLastFour,
      }),
      // Transaction ID if provided
      ...(body.transactionId && { transactionId: body.transactionId }),
    };

    const payment = new Payment(paymentData);
    await payment.save();

    // Update radiology exam charges
    radiologyExam.charges.paid = newPaidAmount;
    radiologyExam.charges.due = Math.max(0, newDueAmount);
    radiologyExam.charges.paymentStatus = newPaymentStatus;
    radiologyExam.charges.paymentMethod = body.paymentMethod;
    radiologyExam.charges.paymentDate = new Date();
    radiologyExam.charges.collectedBy = new mongoose.Types.ObjectId(
      auth.userId!,
    );
    radiologyExam.charges.discount =
      radiologyExam.charges.discount + discountAmount;

    // If payment is fully paid, verify payment
    if (newPaymentStatus === "paid") {
      radiologyExam.paymentVerified = true;
      radiologyExam.paymentVerifiedBy = new mongoose.Types.ObjectId(
        auth.userId!,
      );
      radiologyExam.paymentVerifiedAt = new Date();
      console.log(
        `[DEBUG] Payment verified for exam ${radiologyExam.examId}: paymentVerified set to true`,
      );
    } else {
      console.log(
        `[DEBUG] Payment NOT verified for exam ${radiologyExam.examId}: paymentStatus is ${newPaymentStatus}, not 'paid'`,
      );
    }

    await radiologyExam.save();

    // Populate the response
    const populatedExam = await RadiologyExam.findById(radiologyExam._id)
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .populate("charges.collectedBy", "name")
      .populate("paymentVerifiedBy", "name")
      .lean();

    console.log(
      `Payment processed for direct radiology exam ${radiologyExam.examId}: ${body.amount} ${body.paymentMethod} by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: {
        radiologyExam: populatedExam,
        payment: {
          paymentId: payment.paymentId,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
        },
      },
      message: "Payment processed successfully",
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process payment",
      },
      { status: 500 },
    );
  }
}
