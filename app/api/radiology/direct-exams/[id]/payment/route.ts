// app/api/radiology/direct-exams/[id]/payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    if (!["receptionist", "admin"].includes(auth.userRole || "")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only receptionists can process payments.",
        },
        { status: 403 },
      );
    }

    const { id: examId } = await params;

    const radiologyExam = await prisma.radiologyExam.findUnique({
      where: { id: examId },
    });

    if (!radiologyExam) {
      return NextResponse.json(
        { success: false, error: "Radiology exam not found" },
        { status: 404 },
      );
    }

    if (!radiologyExam.isDirectExam) {
      return NextResponse.json(
        { success: false, error: "This is not a direct radiology exam" },
        { status: 400 },
      );
    }

    const charges = radiologyExam.charges as any;
    if (charges.paymentStatus === "paid") {
      return NextResponse.json(
        { success: false, error: "Payment has already been processed" },
        { status: 400 },
      );
    }

    const body = await request.json();

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

    const totalAmount = charges.totalAmount || 0;
    const paidAmount = charges.paid || 0;
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

    const newPaidAmount = paidAmount + body.amount;
    const newDueAmount = totalAmount - newPaidAmount;
    let newPaymentStatus: "pending" | "partial" | "paid" | "cancelled" = "partial";

    if (newDueAmount <= 0) {
      newPaymentStatus = "paid";
    } else if (newPaidAmount > 0) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = "pending";
    }

    const newCharges = {
      ...charges,
      paid: newPaidAmount,
      due: Math.max(0, newDueAmount),
      paymentStatus: newPaymentStatus,
      paymentMethod: body.paymentMethod,
      paymentDate: new Date(),
      collectedById: auth.userId,
      discount: (charges.discount || 0) + discountAmount,
    };

    const updatedExam = await prisma.radiologyExam.update({
      where: { id: examId },
      data: {
        charges: newCharges,
        paymentVerified: newPaymentStatus === "paid",
        paymentVerifiedById: newPaymentStatus === "paid" ? auth.userId : undefined,
        paymentVerifiedAt: newPaymentStatus === "paid" ? new Date() : undefined,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        patientId: radiologyExam.patientId,
        paymentMethod: body.paymentMethod,
        amount: body.amount,
        taxAmount: 0,
        discountAmount: discountAmount,
        netAmount: body.amount - discountAmount,
        status: "completed",
        paymentDate: new Date(),
        receivedById: auth.userId!,
        department: "radiology",
        serviceType: "direct_radiology_exam",
        notes: body.notes,
        ...(body.paymentMethod === "card" && {
          cardType: body.cardType,
          cardLastFour: body.cardLastFour,
        }),
        ...(body.transactionId && { transactionId: body.transactionId }),
      },
    });

    console.log(
      `Payment processed for direct radiology exam ${radiologyExam.examId}: ${body.amount} ${body.paymentMethod} by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: {
        radiologyExam: updatedExam,
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