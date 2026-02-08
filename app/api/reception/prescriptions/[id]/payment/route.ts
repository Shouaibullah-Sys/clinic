// app/api/reception/prescriptions/[id]/payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Prescription } from "@/lib/models/Prescription";
import { Payment } from "@/lib/models/Payment";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// PUT: Process payment for a prescription
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
    const { id: prescriptionId } = await params;

    // Find the prescription
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return NextResponse.json(
        { success: false, error: "Prescription not found" },
        { status: 404 },
      );
    }

    // Check if prescription is cancelled or expired
    if (
      prescription.status === "cancelled" ||
      prescription.status === "expired"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot process payment for ${prescription.status} prescription`,
        },
        { status: 400 },
      );
    }

    // Check if payment is already verified
    if (prescription.paymentVerified) {
      return NextResponse.json(
        { success: false, error: "Payment has already been verified" },
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
    const totalAmount = prescription.charges.totalAmount;
    const paidAmount = prescription.charges.paid || 0;
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
    let newPaymentStatus: "unpaid" | "partial" | "paid" | "cancelled" =
      "partial";

    if (newDueAmount <= 0) {
      newPaymentStatus = "paid";
    } else if (newPaidAmount > 0) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = "unpaid";
    }

    // Debug logging before payment verification
    console.log(
      `[DEBUG] Payment processing for prescription ${prescription.prescriptionId}:`,
      {
        totalAmount,
        paidAmount,
        bodyAmount: body.amount,
        newPaidAmount,
        newDueAmount,
        newPaymentStatus,
        currentPaymentVerified: prescription.paymentVerified,
      },
    );

    // Create payment record
    const paymentData = {
      patient: prescription.patient,
      paymentMethod: body.paymentMethod,
      amount: body.amount,
      taxAmount: 0,
      discountAmount: discountAmount,
      netAmount: body.amount - discountAmount,
      status: "completed",
      paymentDate: new Date(),
      collectedBy: new mongoose.Types.ObjectId(auth.userId!),
      department: "pharmacy",
      serviceType: "prescription",
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

    // Update prescription charges
    prescription.charges.paid = newPaidAmount;
    prescription.charges.due = Math.max(0, newDueAmount);
    prescription.charges.paymentStatus = newPaymentStatus;
    prescription.charges.paymentMethod = body.paymentMethod;
    prescription.charges.paymentDate = new Date();
    prescription.charges.collectedBy = new mongoose.Types.ObjectId(
      auth.userId!,
    );
    prescription.charges.discount =
      prescription.charges.discount + discountAmount;

    // Update top-level payment status
    if (newPaymentStatus === "paid") {
      prescription.paymentStatus = "paid";
    } else if (newPaymentStatus === "partial") {
      prescription.paymentStatus = "partial";
    } else {
      prescription.paymentStatus = "unpaid";
    }

    // If payment is fully paid, verify payment using the static method
    if (newPaymentStatus === "paid") {
      await Prescription.verifyPayment(
        prescription._id.toString(),
        auth.userId!,
        body.notes,
      );
      console.log(
        `[DEBUG] Payment verified for prescription ${prescription.prescriptionId}: paymentVerified set to true`,
      );
    } else {
      console.log(
        `[DEBUG] Payment NOT verified for prescription ${prescription.prescriptionId}: paymentStatus is ${newPaymentStatus}, not 'paid'`,
      );
    }

    await prescription.save();

    // Populate the response
    const populatedPrescription = await Prescription.findById(prescription._id)
      .populate("patient", "name patientId phone")
      .populate("doctor", "name")
      .populate("charges.collectedBy", "name")
      .populate("paymentVerifiedBy", "name")
      .lean();

    console.log(
      `Payment processed for prescription ${prescription.prescriptionId}: ${body.amount} ${body.paymentMethod} by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: {
        prescription: populatedPrescription,
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

// GET: Get payment details for a prescription
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

    // Only receptionists and admin can view payment details
    const allowedRoles = ["receptionist", "admin"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only receptionists can view payment details.",
        },
        { status: 403 },
      );
    }

    // Unwrap the params promise
    const { id: prescriptionId } = await params;

    // Find the prescription with populated fields
    const prescription = await Prescription.findById(prescriptionId)
      .populate("patient", "name patientId phone email dateOfBirth gender")
      .populate("doctor", "name specialization")
      .populate("charges.collectedBy", "name")
      .populate("paymentVerifiedBy", "name")
      .lean();

    if (!prescription) {
      return NextResponse.json(
        { success: false, error: "Prescription not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: prescription,
    });
  } catch (error: any) {
    console.error("Error fetching payment details:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch payment details",
      },
      { status: 500 },
    );
  }
}
