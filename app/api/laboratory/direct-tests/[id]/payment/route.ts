// app/api/laboratory/direct-tests/[id]/payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { Payment } from "@/lib/models/Payment";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// POST: Process payment for a direct lab test
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
    const { id: testId } = await params;

    // Find the lab test
    const labTest = await LabTest.findById(testId);
    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    // Verify this is a direct test
    if (!labTest.isDirectTest) {
      return NextResponse.json(
        { success: false, error: "This is not a direct lab test" },
        { status: 400 },
      );
    }

    // Check if payment is already completed
    if (labTest.charges.paymentStatus === "paid") {
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
    const totalAmount = labTest.charges.totalAmount;
    const paidAmount = labTest.charges.paid || 0;
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
    console.log(`[DEBUG] Payment processing for test ${labTest.testId}:`, {
      totalAmount,
      paidAmount,
      bodyAmount: body.amount,
      newPaidAmount,
      newDueAmount,
      newPaymentStatus,
      currentPaymentVerified: labTest.paymentVerified,
    });

    // Create payment record
    const paymentData = {
      patient: labTest.patient,
      paymentMethod: body.paymentMethod,
      amount: body.amount,
      taxAmount: 0,
      discountAmount: discountAmount,
      netAmount: body.amount - discountAmount,
      status: "completed",
      paymentDate: new Date(),
      collectedBy: new mongoose.Types.ObjectId(auth.userId!),
      department: "laboratory",
      serviceType: "direct_lab_test",
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

    // Update lab test charges
    labTest.charges.paid = newPaidAmount;
    labTest.charges.due = Math.max(0, newDueAmount);
    labTest.charges.paymentStatus = newPaymentStatus;
    labTest.charges.paymentMethod = body.paymentMethod;
    labTest.charges.paymentDate = new Date();
    labTest.charges.collectedBy = new mongoose.Types.ObjectId(auth.userId!);
    labTest.charges.discount = labTest.charges.discount + discountAmount;

    // If payment is fully paid, verify payment
    if (newPaymentStatus === "paid") {
      labTest.paymentVerified = true;
      labTest.paymentVerifiedBy = new mongoose.Types.ObjectId(auth.userId!);
      labTest.paymentVerifiedAt = new Date();
      console.log(
        `[DEBUG] Payment verified for test ${labTest.testId}: paymentVerified set to true`,
      );
    } else {
      console.log(
        `[DEBUG] Payment NOT verified for test ${labTest.testId}: paymentStatus is ${newPaymentStatus}, not 'paid'`,
      );
    }

    await labTest.save();

    // Populate the response
    const populatedTest = await LabTest.findById(labTest._id)
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .populate("charges.collectedBy", "name")
      .populate("paymentVerifiedBy", "name")
      .lean();

    console.log(
      `Payment processed for direct lab test ${labTest.testId}: ${body.amount} ${body.paymentMethod} by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: {
        labTest: populatedTest,
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
